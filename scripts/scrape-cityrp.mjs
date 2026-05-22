import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://cityrp.org";
const OUTPUT_DIR = path.resolve("archive");

const SOURCES = {
  laws: [
    {
      kind: "law",
      court: null,
      forumUrl: "https://cityrp.org/forums/acts-of-parliament.28/",
      outputSubdir: "laws"
    }
  ],
  courts: [
    {
      kind: "case",
      court: "District Court",
      forumUrl: "https://cityrp.org/forums/district-court.82/",
      outputSubdir: "cases/district-court"
    },
    {
      kind: "case",
      court: "Supreme Court",
      forumUrl: "https://cityrp.org/forums/supreme-court.83/",
      outputSubdir: "cases/supreme-court"
    }
  ],
  library: [
    {
      kind: "library",
      court: null,
      forumUrl: "https://cityrp.org/forums/court-library.20/",
      outputSubdir: "library"
    }
  ]
};

const mode = process.argv[2] ?? "all";
const maxThreads = Number.parseInt(process.env.MAX_THREADS ?? "", 10);

if (!["laws", "courts", "library", "all"].includes(mode)) {
  console.error("Usage: node scripts/scrape-cityrp.mjs [laws|courts|library|all]");
  process.exit(1);
}

const selectedSources = mode === "all" ? [...SOURCES.laws, ...SOURCES.courts, ...SOURCES.library] : SOURCES[mode];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1200 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
});

try {
  const allIndexes = { laws: [], cases: [], library: [] };

  for (const source of selectedSources) {
    console.log(`Scanning ${source.forumUrl}`);
    const resources = await collectForumResources(page, source);
    const resourcesToCapture = Number.isFinite(maxThreads) ? resources.slice(0, maxThreads) : resources;
    const sourceResults = [];

    for (const resource of resourcesToCapture) {
      console.log(`Capturing ${resource.title}`);
      const captured = await captureResource(page, resource, source);
      await saveResource(captured, source);
      sourceResults.push(toIndexEntry(captured, source));
    }

    if (source.kind === "law") allIndexes.laws.push(...sourceResults);
    if (source.kind === "case") allIndexes.cases.push(...sourceResults);
    if (source.kind === "library") allIndexes.library.push(...sourceResults);
  }

  await mkdir(path.join(OUTPUT_DIR, "indexes"), { recursive: true });

  if (mode === "laws" || mode === "all") {
    await writeJson(path.join(OUTPUT_DIR, "indexes", "laws.json"), allIndexes.laws);
  }

  if (mode === "courts" || mode === "all") {
    await writeJson(path.join(OUTPUT_DIR, "indexes", "cases.json"), allIndexes.cases);
  }

  if (mode === "library" || mode === "all") {
    await writeJson(path.join(OUTPUT_DIR, "indexes", "library.json"), allIndexes.library);
  }
} finally {
  await browser.close();
}

async function collectForumResources(page, source) {
  const visitedForumPages = new Set();
  const resources = new Map();
  let nextUrl = source.forumUrl;

  while (nextUrl && !visitedForumPages.has(nextUrl)) {
    visitedForumPages.add(nextUrl);
    await goto(page, nextUrl);

    const pageResources = await page.evaluate((sourceKind) => {
      let links = [
        ...document.querySelectorAll(
          [
            ".structItem--thread .structItem-title a[href*='/threads/']",
            ".discussionListItem .title a[href*='/threads/']",
            sourceKind === "library" ? ".node-title a[href*='/pages/']" : ""
          ].filter(Boolean).join(", ")
        )
      ];

      if (links.length === 0) {
        const bodyMain = document.querySelector(".p-body-main, .p-body-content, main") ?? document.body;
        const selector = sourceKind === "library" ? 'a[href*="/threads/"], a[href*="/pages/"]' : 'a[href*="/threads/"]';
        links = [...bodyMain.querySelectorAll(selector)].filter(
          (link) => !link.closest(".p-body-sidebar, aside, .block[data-widget-key], .block-minorHeader")
        );
      }

      return links
        .map((link) => ({
          title: link.textContent?.replace(/\s+/g, " ").trim() ?? "",
          url: new URL(link.href, location.href).href
        }))
        .filter((resource) => {
          if (!resource.title || resource.url.includes("/post-")) return false;
          if (sourceKind !== "case") return true;
          return /^case:/i.test(resource.title) || /\bv\.?\s+/i.test(resource.title) || /\(\d{4}\)\s*[A-Z]+\s*\d+/i.test(resource.title);
        });
    }, source.kind);

    for (const resource of pageResources) {
      const normalized = normalizeResourceUrl(resource.url);
      if (normalized && !resources.has(normalized)) {
        resources.set(normalized, { ...resource, url: normalized });
      }
    }

    nextUrl = await getNextPageUrl(page, visitedForumPages);
  }

  return [...resources.values()];
}

async function captureResource(page, resource, source) {
  if (source.kind === "library" && resource.url.includes("/pages/")) {
    return captureStaticPage(page, resource, source);
  }

  return captureThread(page, resource, source);
}

async function captureStaticPage(page, resource, source) {
  await goto(page, resource.url);
  await expandHiddenContent(page);

  const pageData = await page.evaluate(() => {
    const cleanText = (value) =>
      value
        .replace(/\u00a0/g, " ")
        .replace(/\u200b/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
    const text = (element) => cleanText(element?.innerText || element?.textContent || "");
    const contentNode =
      document.querySelector(".p-body-content .block-body") ||
      document.querySelector(".p-body-content") ||
      document.querySelector("main") ||
      document.body;
    const title =
      text(document.querySelector("h1.p-title-value")) ||
      text(document.querySelector("h1")) ||
      document.title.replace(/\s*\|\s*CityRP\s*$/i, "").trim();
    const images = [...contentNode.querySelectorAll("img[src]")]
      .map((image) => ({
        src: new URL(image.getAttribute("src"), location.href).href,
        alt: image.getAttribute("alt") || "",
        title: image.getAttribute("title") || ""
      }))
      .filter((image) => !/\/styles\/|\/avatars\/|data:image\/svg/i.test(image.src));

    return {
      title,
      rawText: text(contentNode),
      images
    };
  });

  return {
    ...resource,
    title: pageData.title || resource.title,
    sourceKind: source.kind,
    court: source.court,
    scrapedAt: new Date().toISOString(),
    rawText: pageData.rawText,
    images: pageData.images
  };
}

async function captureThread(page, thread, source) {
  const visitedThreadPages = new Set();
  const posts = [];
  let nextUrl = thread.url;
  let pageNumber = 1;

  while (nextUrl && !visitedThreadPages.has(nextUrl)) {
    visitedThreadPages.add(nextUrl);
    await goto(page, nextUrl);
    await expandHiddenContent(page);

    const pageData = await page.evaluate(() => {
      const cleanText = (value) =>
        value
          .replace(/\u00a0/g, " ")
          .replace(/\u200b/g, "\n")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n[ \t]+/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/[ \t]{2,}/g, " ")
          .trim();
      const text = (element) => cleanText(element?.innerText || element?.textContent || "");
      const attr = (selector) => text(document.querySelector(selector));
      const title =
        attr("h1.p-title-value") ||
        attr("h1") ||
        document.title.replace(/\s*\|\s*CityRP\s*$/i, "").trim();

      const messageNodes = [
        ...document.querySelectorAll("article.message, .message, [data-content='post']")
      ];

      const posts = messageNodes
        .map((node, index) => {
          const bodyNode = node.querySelector(".bbWrapper, .message-body, article") || node;
          const author =
            text(node.querySelector(".message-name, .username, [itemprop='name']")) ||
            text(node.querySelector("h4"));
          const date =
            node.querySelector("time")?.getAttribute("datetime") ||
            text(node.querySelector("time, .u-dt"));
          const postNumber =
            text(node.querySelector(".message-attribution-opposite a, a[href*='/post-']")) ||
            `#${index + 1}`;
          const postUrl =
            node.querySelector(".message-attribution-opposite a[href], a[href*='/post-']")?.href ||
            location.href;
          const body = text(bodyNode) || text(node);
          const images = [...bodyNode.querySelectorAll("img[src]")]
            .map((image) => ({
              src: new URL(image.getAttribute("src"), location.href).href,
              alt: image.getAttribute("alt") || "",
              title: image.getAttribute("title") || ""
            }))
            .filter((image) => !/\/styles\/|\/avatars\/|data:image\/svg/i.test(image.src));

          return {
            author,
            date,
            postNumber,
            postUrl,
            images,
            rawText: body
          };
        })
        .filter((post) => post.rawText);

      return {
        title,
        threadAuthor: attr(".p-description a.username, .p-description .username"),
        startDate: attr(".p-description time, .p-description .u-dt"),
        posts
      };
    });

    posts.push(
      ...pageData.posts.map((post) => ({
        ...post,
        pageNumber
      }))
    );

    thread.title = source.kind === "law" ? cleanLawTitle(pageData.title || thread.title, thread.url) : pageData.title || thread.title;
    thread.threadAuthor = thread.threadAuthor || pageData.threadAuthor;
    thread.startDate = thread.startDate || pageData.startDate;

    nextUrl = await getNextPageUrl(page, visitedThreadPages);
    pageNumber += 1;
  }

  return {
    ...thread,
    sourceKind: source.kind,
    court: source.court,
    scrapedAt: new Date().toISOString(),
    posts
  };
}

async function expandHiddenContent(page) {
  const selectors = [
    "button:has-text('Read more')",
    "a:has-text('Read more')",
    "button:has-text('Click to expand')",
    "a:has-text('Click to expand')",
    "button:has-text('Expand')",
    "a:has-text('Expand')",
    ".bbCodeBlock-expandLink",
    ".message-expandLink",
    ".js-expandLink"
  ];

  for (let pass = 0; pass < 5; pass += 1) {
    let clicked = await page.evaluate(() => {
      const clickable = [
        ...document.querySelectorAll(
          [
            ".bbCodeSpoiler-button",
            ".bbCodeSpoiler-expandLink",
            ".js-spoilerButton",
            ".bbCodeBlock-expandLink",
            ".message-expandLink",
            ".js-expandLink"
          ].join(", ")
        )
      ];

      let count = 0;
      for (const element of clickable) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        element.click();
        count += 1;
      }

      return count;
    });

    for (const selector of selectors) {
      const locators = await page.locator(selector).all();

      for (const locator of locators) {
        if (!(await locator.isVisible().catch(() => false))) continue;
        await locator.click({ timeout: 1000 }).catch(() => {});
        clicked += 1;
        await page.waitForTimeout(150);
      }
    }

    if (clicked === 0) break;
  }
}

async function saveResource(captured, source) {
  const slug = archiveSlug(captured.title || captured.url, captured.url);
  const dir = path.join(OUTPUT_DIR, source.outputSubdir, slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.md"), toMarkdown(captured, source), "utf8");
  await writeJson(path.join(dir, "source.json"), captured);
}

function toMarkdown(captured, source) {
  if (source.kind === "law") return lawMarkdown(captured);
  if (source.kind === "library") return libraryMarkdown(captured);
  return caseMarkdown(captured, source);
}

function libraryMarkdown(captured) {
  if (captured.posts) {
    return [
      `# ${captured.title}`,
      "",
      `Type: Court Library Thread`,
      `Forum Link: ${captured.url}`,
      "",
      "## Source Metadata",
      `- Thread author: ${captured.threadAuthor || ""}`,
      `- Start date: ${captured.startDate || ""}`,
      `- Scraped at: ${captured.scrapedAt}`,
      `- Posts captured: ${captured.posts.length}`,
      "",
      "## Full Text",
      "",
      ...captured.posts.flatMap((post) => postMarkdown(post)),
      ""
    ].join("\n");
  }

  return [
    `# ${captured.title}`,
    "",
    `Type: Court Library Page`,
    `Page Link: ${captured.url}`,
    "",
    "## Source Metadata",
    `- Scraped at: ${captured.scrapedAt}`,
    ...(captured.images?.length ? [`- Images captured: ${captured.images.length}`] : []),
    "",
    ...(captured.images?.length
      ? ["## Images", "", ...captured.images.map((image) => `- ${image.src}${image.alt ? ` (${image.alt})` : ""}`), ""]
      : []),
    "## Full Text",
    "",
    captured.rawText || "",
    ""
  ].join("\n");
}

function lawMarkdown(captured) {
  const firstPost = captured.posts[0]?.rawText ?? "";
  const metadata = extractLawMetadata(firstPost);

  return [
    `# ${captured.title}`,
    "",
    `Status: Active`,
    `Type: ${metadata.type || "Act of Parliament"}`,
    `Ratified: ${metadata.ratified || ""}`,
    `Forum Link: ${captured.url}`,
    `Original Bill Link: ${metadata.originalBillLink || ""}`,
    `Final Vote: ${metadata.finalVote || ""}`,
    "",
    "## Summary",
    "Pending.",
    "",
    "## Key Topics",
    "- Pending.",
    "",
    "## Source Metadata",
    `- Thread author: ${captured.threadAuthor || ""}`,
    `- Start date: ${captured.startDate || ""}`,
    `- Scraped at: ${captured.scrapedAt}`,
    `- Posts captured: ${captured.posts.length}`,
    "",
    "## Amendment History",
    metadata.amendments.length ? metadata.amendments.map((line) => `- ${line}`).join("\n") : "- Pending review.",
    "",
    "## Full Text",
    "",
    firstPost,
    "",
    "## Additional Thread Posts",
    "",
    ...captured.posts.slice(1).flatMap((post) => postMarkdown(post)),
    "",
    "## Lawyer Notes",
    "Pending.",
    ""
  ].join("\n");
}

function caseMarkdown(captured, source) {
  return [
    `# ${captured.title}`,
    "",
    `Court: ${source.court}`,
    `Status: ${extractCaseStatus(captured.title)}`,
    `Case Number: ${extractCaseNumber(captured.title)}`,
    `Forum Link: ${captured.url}`,
    "",
    "## Summary",
    "Pending.",
    "",
    "## Parties",
    ...extractParties(captured.title).map((party) => `- ${party}`),
    "",
    "## Legal Issues",
    "- Pending.",
    "",
    "## Source Metadata",
    `- Thread author: ${captured.threadAuthor || ""}`,
    `- Start date: ${captured.startDate || ""}`,
    `- Scraped at: ${captured.scrapedAt}`,
    `- Posts captured: ${captured.posts.length}`,
    "",
    "## Docket Timeline",
    "",
    ...captured.posts.flatMap((post) => postMarkdown(post)),
    "",
    "## Outcome",
    "Pending.",
    "",
    "## Precedential Value",
    "Pending.",
    "",
    "## Lawyer Notes",
    "Pending.",
    ""
  ].join("\n");
}

function postMarkdown(post) {
  return [
    `### ${post.postNumber}`,
    `Author: ${post.author || ""}`,
    `Date: ${post.date || ""}`,
    `Page: ${post.pageNumber}`,
    `Post Link: ${post.postUrl || ""}`,
    `Type: Unclassified`,
    ...(post.images?.length
      ? ["Images:", ...post.images.map((image) => `- ${image.src}${image.alt ? ` (${image.alt})` : ""}`)]
      : []),
    "",
    post.rawText,
    ""
  ];
}

function extractLawMetadata(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const findValue = (label) => {
    const line = lines.find((candidate) => candidate.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.slice(line.indexOf(":") + 1).trim() : "";
  };

  return {
    originalBillLink: findValue("Passed Bill Link"),
    finalVote: findValue("Final Vote"),
    ratified: findValue("Ratified"),
    type: findValue("Type"),
    amendments: lines
      .filter((line) => /^[-*]\s*Amended/i.test(line))
      .map((line) => line.replace(/^[-*]\s*/, ""))
  };
}

function cleanLawTitle(title, url = "") {
  const normalized = title.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const knownPrefixes = [
    "Act of Parliament",
    "Law & Justice",
    "Plots",
    "Government",
    "Parliament",
    "Courts",
    "Business",
    "Finance",
    "International Relations",
    "Social",
    "Culture",
    "Diplomacy",
    "Transportation",
    "& Contracts",
    "& Economy"
  ];

  for (const prefix of knownPrefixes) {
    if (normalized.toLowerCase().startsWith(`${prefix.toLowerCase()} `)) {
      const remainder = normalized.slice(prefix.length).trim();
      if (!url || slugify(remainder) === urlTitleSlug(url)) return remainder;
    }
  }

  return normalized;
}

function extractCaseStatus(title) {
  const knownStatuses = ["Pending", "Dismissed", "Adjourned", "Decided", "Closed", "Filed", "Appealed"];
  const normalized = title.replace(/\s+/g, " ").trim();

  for (const status of knownStatuses) {
    if (normalized.toLowerCase().startsWith(`case: ${status.toLowerCase()} `)) {
      return status;
    }
  }

  const match = normalized.match(/^Case:\s*([^-]+)-/i);
  return match?.[1]?.trim() ?? "";
}

function extractCaseNumber(title) {
  const match = title.match(/\((\d{4})\)\s*([A-Z]+\s*\d+)/i);
  return match ? `${match[1]} ${match[2].replace(/\s+/, " ")}` : "";
}

function extractParties(title) {
  const cleaned = title
    .replace(/^Case:\s*(Pending|Dismissed|Adjourned|Decided|Closed|Filed|Appealed)\s+/i, "")
    .replace(/^Case:\s*[^-]+-\s*/i, "")
    .replace(/^Appeal on the Matter of\s+/i, "")
    .replace(/\(\d{4}\)\s*[A-Z]+\s*\d+.*/i, "")
    .trim();

  const parts = cleaned.split(/\s+v\.?\s+/i);
  if (parts.length !== 2) return ["Plaintiff:", "Defendant:"];
  return [`Plaintiff: ${parts[0].trim()}`, `Defendant: ${parts[1].trim()}`];
}

function toIndexEntry(captured, source) {
  return {
    title: captured.title,
    slug: archiveSlug(captured.title || captured.url, captured.url),
    kind: source.kind,
    court: source.court,
    url: captured.url,
    scrapedAt: captured.scrapedAt,
    postsCaptured: captured.posts?.length ?? 0,
    imagesCaptured: captured.images?.length ?? captured.posts?.reduce((total, post) => total + (post.images?.length ?? 0), 0) ?? 0
  };
}

async function getNextPageUrl(page, visited) {
  const candidates = await page.evaluate(() => {
    const links = [...document.querySelectorAll("a[href]")];
    return links
      .filter((link) => /next/i.test(link.textContent ?? "") || link.getAttribute("rel") === "next")
      .map((link) => new URL(link.href, location.href).href);
  });

  return candidates.find((url) => !visited.has(url)) ?? null;
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeResourceUrl(url) {
  try {
    const parsed = new URL(url, BASE_URL);
    parsed.hash = "";
    parsed.search = "";
    return parsed.href;
  } catch {
    return null;
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function archiveSlug(title, url) {
  const threadId = extractThreadId(url);
  const base = slugify(title || url);
  return threadId ? `${base}-${threadId}` : base;
}

function extractThreadId(url) {
  const match = url.match(/\.([0-9]+)\/?$/);
  return match?.[1] ?? "";
}

function urlTitleSlug(url) {
  const match = url.match(/\/threads\/([^/.]+)/);
  return match?.[1] ?? "";
}
