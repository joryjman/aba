import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ARCHIVE_DIR = path.join(ROOT, "archive");
const DATA_DIR = path.join(ROOT, "data");
const INDEX_PATH = path.join(DATA_DIR, "legal-index.json");
const SQLITE_PATH = path.join(DATA_DIR, "legal.sqlite");

const TAG_RULES = [
  ["criminal", /\b(crime|criminal|misdemeanor|felony|arrest|jail|murder|assault|theft|police|prohibited|perjury|contempt)\b/i],
  ["court procedure", /\b(court|judge|justice|motion|objection|appeal|summons|trial|verdict|judgment|standing|filing)\b/i],
  ["civil litigation", /\b(civil|damages|contract|plaintiff|defendant|injunction|class action|standing)\b/i],
  ["government", /\b(parliament|minister|ministry|government|executive|speaker|election|vote|public office)\b/i],
  ["property", /\b(plot|property|land|tenant|landlord|zoning|industrial|rent|rental)\b/i],
  ["business", /\b(business|company|corporation|contract|worker|employment|minimum wage|fair competition)\b/i],
  ["finance", /\b(bank|banking|tax|financial|loan|interest|stock|consumer|sourcing|tariff)\b/i],
  ["public records", /\b(freedom of information|foia|record|reporting|public information)\b/i],
  ["rights", /\b(constitution|rights|due process|search|seizure|equal treatment|voting)\b/i],
  ["templates", /\b(template|thread title|thread body|filing structure|answer to civil complaint)\b/i]
];

await mkdir(DATA_DIR, { recursive: true });

const lawsIndex = await readJsonIfExists(path.join(ARCHIVE_DIR, "indexes", "laws.json"), []);
const casesIndex = await readJsonIfExists(path.join(ARCHIVE_DIR, "indexes", "cases.json"), []);
const libraryIndex = await readJsonIfExists(path.join(ARCHIVE_DIR, "indexes", "library.json"), []);

const docs = [];
const posts = [];
const sections = [];
const offenses = [];

for (const item of lawsIndex) {
  const source = await readSource("laws", item.slug);
  const firstPost = source.posts?.[0]?.rawText ?? "";
  const metadata = extractLawMetadata(firstPost);
  const fullText = collectText(source);
  const lawGuide = buildLawGuide(firstPost, item.title, metadata);
  const doc = makeDoc({
    item,
    source,
    type: "law",
    category: categorize(`${item.title}\n${fullText}`, "law"),
    status: inferLawStatus(item.title, fullText),
    summary: lawGuide.summary,
    text: fullText,
    metadata: {
      ratified: metadata.ratified,
      finalVote: metadata.finalVote,
      originalBillUrl: metadata.originalBillUrl,
      lawType: metadata.type || "Act of Parliament",
      amendments: metadata.amendments,
      definitions: extractDefinitions(firstPost).slice(0, 12),
      aiGuide: lawGuide
    }
  });
  docs.push(doc);
  sections.push(...extractSections(firstPost, doc.id));
  offenses.push(...extractOffenses(firstPost, doc));
  posts.push(...extractPosts(source, doc.id));
}

for (const item of casesIndex) {
  const courtFolder = item.court === "Supreme Court" ? "cases/supreme-court" : "cases/district-court";
  const source = await readSource(courtFolder, item.slug);
  const fullText = collectText(source);
  const caseMeta = extractCaseMetadata(item.title);
  const caseAnalysis = buildCaseAnalysis(source, caseMeta);
  const doc = makeDoc({
    item,
    source,
    type: "case",
    category: "case law",
    status: caseMeta.status,
    summary: caseAnalysis.short,
    text: fullText,
    metadata: {
      court: item.court,
      caseNumber: caseMeta.caseNumber,
      plaintiff: caseMeta.plaintiff,
      defendant: caseMeta.defendant,
      imagesCaptured: countImages(source),
      proceduralSignals: summarizeProceduralHistory(source.posts ?? []),
      aiCase: caseAnalysis,
      importantPrecedent: inferImportantPrecedent(item.title, source, caseAnalysis)
    }
  });
  docs.push(doc);
  posts.push(...extractPosts(source, doc.id));
}

for (const item of libraryIndex) {
  const source = await readSource("library", item.slug);
  const fullText = collectText(source);
  const doc = makeDoc({
    item,
    source,
    type: "library",
    category: categorize(`${item.title}\n${fullText}`, "library"),
    status: "Reference",
    summary: summarizeReference(fullText, item.title),
    text: fullText,
    metadata: {
      resourceType: source.posts ? "Thread" : "Page",
      imagesCaptured: countImages(source)
    }
  });
  docs.push(doc);
  posts.push(...extractPosts(source, doc.id));
}

const lawTitles = docs.filter((doc) => doc.type === "law").map((doc) => doc.title);
const links = inferLinks(docs, lawTitles);
const allTags = [...new Set(docs.flatMap((doc) => doc.tags))].sort();
const stats = {
  documents: docs.length,
  laws: docs.filter((doc) => doc.type === "law").length,
  cases: docs.filter((doc) => doc.type === "case").length,
  library: docs.filter((doc) => doc.type === "library").length,
  sections: sections.length,
  offenses: offenses.length,
  posts: posts.length,
  images: docs.reduce((sum, doc) => sum + (doc.metadata.imagesCaptured ?? 0), 0),
  tags: allTags.length,
  builtAt: new Date().toISOString()
};

const index = {
  stats,
  tags: allTags,
  documents: docs,
  sections,
  offenses,
  posts,
  links
};

await writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
await buildSqlite(index);

console.log(`Built ${path.relative(ROOT, INDEX_PATH)}`);
console.log(`Built ${path.relative(ROOT, SQLITE_PATH)}`);
console.log(JSON.stringify(stats, null, 2));

async function buildSqlite(index) {
  await rm(SQLITE_PATH, { force: true });
  const db = new DatabaseSync(SQLITE_PATH);
  db.exec(`
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT,
      status TEXT,
      summary TEXT,
      source_url TEXT,
      archive_path TEXT,
      scraped_at TEXT,
      text TEXT,
      metadata TEXT
    );
    CREATE TABLE sections (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      number TEXT,
      heading TEXT,
      body TEXT
    );
    CREATE TABLE offenses (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      law_title TEXT,
      section_number TEXT,
      section_heading TEXT,
      subsection TEXT,
      name TEXT,
      offense_type TEXT,
      penalty TEXT,
      elements TEXT,
      citation TEXT
    );
    CREATE TABLE posts (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      author TEXT,
      date TEXT,
      post_url TEXT,
      page_number INTEGER,
      body TEXT,
      images TEXT
    );
    CREATE TABLE tags (
      name TEXT PRIMARY KEY
    );
    CREATE TABLE document_tags (
      document_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (document_id, tag)
    );
    CREATE TABLE links (
      from_document_id TEXT NOT NULL,
      to_document_id TEXT NOT NULL,
      relationship TEXT NOT NULL,
      PRIMARY KEY (from_document_id, to_document_id, relationship)
    );
  `);

  const insertDoc = db.prepare(`
    INSERT INTO documents VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSection = db.prepare(`INSERT INTO sections VALUES (?, ?, ?, ?, ?)`);
  const insertOffense = db.prepare(`INSERT INTO offenses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertPost = db.prepare(`INSERT INTO posts VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertTag = db.prepare(`INSERT INTO tags VALUES (?)`);
  const insertDocTag = db.prepare(`INSERT INTO document_tags VALUES (?, ?)`);
  const insertLink = db.prepare(`INSERT INTO links VALUES (?, ?, ?)`);

  db.exec("BEGIN");
  try {
    for (const doc of index.documents) {
      insertDoc.run(doc.id, doc.type, doc.title, doc.category, doc.status, doc.summary, doc.url, doc.archivePath, doc.scrapedAt, doc.text, JSON.stringify(doc.metadata));
      for (const tag of doc.tags) insertDocTag.run(doc.id, tag);
    }
    for (const tag of index.tags) insertTag.run(tag);
    for (const section of index.sections) insertSection.run(section.id, section.documentId, section.number, section.heading, section.body);
    for (const offense of index.offenses) insertOffense.run(offense.id, offense.documentId, offense.lawTitle, offense.sectionNumber, offense.sectionHeading, offense.subsection, offense.name, offense.offenseType, offense.penalty, offense.elements, offense.citation);
    for (const post of index.posts) insertPost.run(post.id, post.documentId, post.author, post.date, post.postUrl, post.pageNumber, post.body, JSON.stringify(post.images ?? []));
    for (const link of index.links) insertLink.run(link.from, link.to, link.relationship);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  db.close();
}

function makeDoc({ item, source, type, category, status, summary, text, metadata }) {
  const id = `${type}:${item.slug}`;
  const tags = inferTags(`${item.title}\n${summary}\n${text}`, type, category);
  return {
    id,
    type,
    title: item.title,
    slug: item.slug,
    category,
    status,
    summary,
    url: item.url,
    scrapedAt: item.scrapedAt,
    archivePath: archivePathFor(type, item, source),
    sourcePath: sourcePathFor(type, item, source),
    tags,
    text: compactText(text),
    excerpt: makeExcerpt(text),
    citation: makeCitation(type, item, metadata),
    metadata
  };
}

function archivePathFor(type, item, source) {
  if (type === "law") return `archive/laws/${item.slug}/index.md`;
  if (type === "library") return `archive/library/${item.slug}/index.md`;
  const courtDir = source.court === "Supreme Court" ? "supreme-court" : "district-court";
  return `archive/cases/${courtDir}/${item.slug}/index.md`;
}

function sourcePathFor(type, item, source) {
  return archivePathFor(type, item, source).replace(/index\.md$/, "source.json");
}

async function readSource(folder, slug) {
  return JSON.parse(await readFile(path.join(ARCHIVE_DIR, folder, slug, "source.json"), "utf8"));
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function collectText(source) {
  if (source.rawText) return source.rawText;
  return (source.posts ?? []).map((post) => post.rawText).join("\n\n");
}

function extractLawMetadata(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const value = (label) => {
    const line = lines.find((candidate) => candidate.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.slice(line.indexOf(":") + 1).trim() : "";
  };
  return {
    originalBillUrl: value("Passed Bill Link"),
    finalVote: value("Final Vote"),
    ratified: value("Ratified"),
    type: value("Type"),
    amendments: lines.filter((line) => /^[-*]\s*Amended/i.test(line)).map((line) => line.replace(/^[-*]\s*/, ""))
  };
}

function extractCaseMetadata(title) {
  const status = title.match(/^Case:\s+(\w+)/i)?.[1] ?? "";
  const caseNumber = title.match(/\((\d{4})\)\s*([A-Z]+\s*\d+)/i);
  const cleaned = title
    .replace(/^Case:\s*(Pending|Dismissed|Adjourned|Decided|Closed|Filed|Appealed)\s+/i, "")
    .replace(/^Case:\s*[^-]+-\s*/i, "")
    .replace(/^Appeal on the Matter of\s+/i, "")
    .replace(/\(\d{4}\)\s*[A-Z]+\s*\d+.*/i, "")
    .trim();
  const parties = cleaned.split(/\s+v\.?\s+/i);
  return {
    status,
    caseNumber: caseNumber ? `${caseNumber[1]} ${caseNumber[2].replace(/\s+/, " ")}` : "",
    plaintiff: parties[0] ?? "",
    defendant: parties[1] ?? ""
  };
}

function extractPosts(source, documentId) {
  return (source.posts ?? []).map((post, index) => ({
    id: `${documentId}:post:${index + 1}`,
    documentId,
    author: post.author ?? "",
    date: post.date ?? "",
    postUrl: post.postUrl ?? "",
    pageNumber: post.pageNumber ?? 1,
    body: compactText(post.rawText ?? ""),
    images: post.images ?? []
  }));
}

function extractSections(text, documentId) {
  const matches = [...text.matchAll(/^(\d+)\.\s+(.+)$/gm)];
  return matches.map((match, index) => {
    const next = matches[index + 1];
    const body = text.slice(match.index + match[0].length, next?.index ?? text.length).trim();
    return {
      id: `${documentId}:section:${index + 1}:${match[1]}`,
      documentId,
      number: match[1],
      heading: match[2].trim(),
      body: compactText(body)
    };
  });
}

function extractOffenses(text, doc) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const result = [];
  let sectionHeading = "";
  let sectionNumber = "";
  for (let i = 0; i < lines.length; i += 1) {
    const section = lines[i].match(/^\d+\.\s+(.+)/);
    if (section) {
      sectionNumber = lines[i].match(/^(\d+)\./)?.[1] ?? "";
      sectionHeading = section[1];
    }

    const offenseName = lines[i].match(/^\(([a-z])\)\s+(.+)/i);
    if (!offenseName) continue;
    const subsection = offenseName[1].toLowerCase();
    const name = offenseName[2].trim();
    if (!isPotentialOffenseHeader(lines, i, name)) continue;

    const nextBoundary = findNextOffenseBoundary(lines, i + 1);
    const windowLines = lines.slice(i + 1, nextBoundary < 0 ? Math.min(lines.length, i + 60) : nextBoundary);
    const offenseType = findAfter(windowLines, /(?:^\([ivx]+\)\s*)?Offense Type\s*:\s*(.+)/i);
    const penalty = extractPenalty(windowLines);
    if (!offenseType && !penalty) continue;

    const elementsStart = windowLines.findIndex((line) => /commits an offense if/i.test(line));
    const elements = elementsStart >= 0 ? collectFieldBlock(windowLines, elementsStart, [/^Additional Penalt/i, /^Penalty\s*:?/i, /^Offense Type\s*:/i]) : "";
    result.push({
      id: `${doc.id}:offense:${result.length + 1}`,
      documentId: doc.id,
      lawTitle: doc.title,
      sectionNumber,
      sectionHeading,
      subsection,
      name,
      offenseType: offenseType || "",
      penalty: penalty || "",
      elements: compactText(elements),
      citation: makeOffenseCitation(doc.citation, sectionNumber, subsection)
    });
  }
  return result;
}

function extractPenalty(lines) {
  const penaltyIndex = lines.findIndex((line) => /^(?:\([ivx]+\)\s*)?Penalty\s*:?\s*/i.test(line));
  if (penaltyIndex < 0) return extractUnlabeledPenalty(lines);
  const primary = collectFieldBlock(lines, penaltyIndex, [/^(?:\([ivx]+\)\s*)?A person commits an offense if/i, /^(?:\([ivx]+\)\s*)?A person commits a crime if/i]);
  const additionalIndex = lines.findIndex((line) => /^(?:\([ivx]+\)\s*)?Additional Penalt/i.test(line));
  if (additionalIndex < 0) return primary;
  const additional = collectFieldBlock(lines, additionalIndex, [/^(?:\([ivx]+\)\s*)?A person commits an offense if/i, /^(?:\([ivx]+\)\s*)?A person commits a crime if/i]);
  return compactText([primary, additional].filter(Boolean).join(" "));
}

function extractUnlabeledPenalty(lines) {
  const typeIndex = lines.findIndex((line) => /^(?:\([ivx]+\)\s*)?Offense Type\s*:/i.test(line));
  if (typeIndex < 0) return "";
  const candidateIndex = typeIndex + 1;
  const candidate = lines[candidateIndex] ?? "";
  if (!/^\([ivx]+\)\s+/i.test(candidate)) return "";
  if (/commits an offense if|commits a crime if|additional penalty|offense type/i.test(candidate)) return "";
  return collectUnlabeledFieldBlock(lines, candidateIndex, [/^(?:\([ivx]+\)\s*)?A person commits an offense if/i, /^(?:\([ivx]+\)\s*)?A person commits a crime if/i]);
}

function collectFieldBlock(lines, startIndex, stopPatterns) {
  const first = lines[startIndex].replace(/^(?:\([ivx]+\)\s*)?[^:]+:?\s*/i, "").trim();
  const collected = first ? [first] : [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^(?:\([ivx]+\)\s*)?Offense Type\s*:/i.test(line)) break;
    if (stopPatterns.some((pattern) => pattern.test(line))) break;
    if (/^\([a-z]\)\s+.+/i.test(line) && !/^\((i|ii|iii|iv|v|vi|vii|viii|ix|x)\)/i.test(line)) break;
    if (/^\d+\.\s+/.test(line)) break;
    collected.push(line);
  }
  return compactText(collected.join(" "));
}

function collectUnlabeledFieldBlock(lines, startIndex, stopPatterns) {
  const first = lines[startIndex].replace(/^\([ivx]+\)\s*/i, "").trim();
  const collected = first ? [first] : [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (stopPatterns.some((pattern) => pattern.test(line))) break;
    if (/^(?:\([ivx]+\)\s*)?Offense Type\s*:/i.test(line)) break;
    if (/^\([a-z]\)\s+.+/i.test(line) && !/^\((i|ii|iii|iv|v|vi|vii|viii|ix|x)\)/i.test(line)) break;
    if (/^\d+\.\s+/.test(line)) break;
    collected.push(line);
  }
  return compactText(collected.join(" "));
}

function findAfter(lines, regex) {
  for (const line of lines) {
    const match = line.match(regex);
    if (match) return match[1]?.trim() || "";
  }
  return "";
}

function isPotentialOffenseHeader(lines, index, name) {
  if (name.length > 72 || /[.;:]$/.test(name) || /\bshall\b/i.test(name)) return false;
  if (/^(offense type|penalty|additional penalty|if\b|when\b|with\b|and\b)/i.test(name)) return false;
  const lookahead = lines.slice(index + 1, index + 8).join("\n");
  return /Offense Type\s*:|Penalty\s*:?/i.test(lookahead);
}

function findNextOffenseBoundary(lines, start) {
  for (let i = start; i < lines.length; i += 1) {
    if (/^\d+\.\s+/.test(lines[i])) return i;
    const match = lines[i].match(/^\(([a-z])\)\s+(.+)/i);
    if (match && isPotentialOffenseHeader(lines, i, match[2].trim())) return i;
  }
  return -1;
}

function inferLawStatus(title, text) {
  if (/repealed|repeal/i.test(title) || /\bshall be repealed\b/i.test(text.slice(0, 1200))) return "Review";
  return "Active";
}

function categorize(text, fallback) {
  const hits = TAG_RULES.filter(([, regex]) => regex.test(text)).map(([tag]) => tag);
  if (hits.includes("criminal")) return "criminal law";
  if (hits.includes("court procedure")) return "court procedure";
  if (hits.includes("civil litigation")) return "civil litigation";
  if (hits.includes("public records")) return "public records";
  if (hits.includes("property")) return "property";
  if (hits.includes("business")) return "business";
  if (hits.includes("finance")) return "finance";
  if (hits.includes("government")) return "government";
  return fallback === "library" ? "reference" : "general";
}

function inferTags(text, type, category) {
  const tags = new Set([type, category]);
  for (const [tag, regex] of TAG_RULES) {
    if (regex.test(text)) tags.add(tag);
  }
  return [...tags].sort();
}

function buildLawGuide(text, title, metadata) {
  const preamble = extractBlock(text, /Preamble:\s*/i, [/\n\s*1\./i, /\n\s*Section/i, /\n\s*Enactment:/i]);
  const sections = extractSections(text, "preview").slice(0, 8);
  const definitions = extractDefinitions(text).slice(0, 8);
  const purpose = preamble || `${title} is archived from the Acts of Parliament forum. Use the source text and amendment history before citing.`;
  const keyProvisions = sections.map((section) => `${section.number}. ${section.heading}`);
  const enforcement = inferEnforcement(text);
  const practicalUse = inferLawPracticeNotes(title, text);

  return {
    summary: compactText(purpose).slice(0, 900),
    purpose: compactText(purpose),
    keyProvisions,
    definitions,
    enforcement,
    practicalUse,
    amendmentCount: metadata.amendments.length
  };
}

function buildCaseSummary(source, meta) {
  const posts = source.posts ?? [];
  const first = posts[0]?.rawText ?? "";
  const finalPost = findFinalDecisionPost(posts);
  const plaintiffPosition = extractBlock(first, /(?:Complaint|Civil Complaint|Criminal Information|Appeal)\s*/i, [/\n\s*Parties/i, /\n\s*Factual Allegations/i, /\n\s*Legal Claims/i, /\n\s*Prayer for Relief/i]) || makeExcerpt(first);
  const defendantPost = posts.find((post) => /answer|response|defen[cs]e|motion to dismiss|objection/i.test(post.rawText ?? "") && post !== posts[0]);
  const defendantPosition = defendantPost ? makeExcerpt(defendantPost.rawText) : "No clear defendant response was automatically identified in the captured docket. Review the full post timeline for party arguments.";
  const legalIssues = extractLegalIssues(first, posts);
  const requestedRelief = extractBlock(first, /Prayer for Relief:\s*/i, [/\n\s*Verification/i, /\n\s*Evidence/i]) || "";
  const finalDecision = finalPost ? makeExcerpt(finalPost.rawText, 4) : inferOutcomeFromStatus(meta.status);
  const relevance = inferCaseRelevance(source, meta, legalIssues, finalDecision);
  const proceduralHistory = summarizeProceduralHistory(posts);
  const short = `${[meta.plaintiff, meta.defendant].filter(Boolean).join(" v. ")}: ${compactText(plaintiffPosition)}`.slice(0, 700);

  return {
    short,
    plaintiffPosition: compactText(plaintiffPosition),
    defendantPosition: compactText(defendantPosition),
    legalIssues,
    requestedRelief: compactText(requestedRelief),
    proceduralHistory,
    finalDecision: compactText(finalDecision),
    relevance,
    finalDecisionPostUrl: finalPost?.postUrl ?? ""
  };
}

function buildCaseAnalysis(source, meta) {
  const posts = source.posts ?? [];
  const first = posts[0]?.rawText ?? "";
  const finalPost = findFinalDecisionPost(posts);
  const finalText = finalPost?.rawText ?? "";
  const plaintiffPosition = extractPartyPosition(finalText, "plaintiff") || extractPartyPosition(first, "plaintiff") || extractBlock(first, /(?:Complaint|Civil Complaint|Criminal Information|Appeal)\s*:?\s*/i, [/\n\s*Parties/i, /\n\s*Factual Allegations/i, /\n\s*Legal Claims/i, /\n\s*Prayer for Relief/i]) || makeExcerpt(first, 3);
  const defensePost = findDefensePost(posts);
  const defendantPosition = extractPartyPosition(finalText, "defendant") || (defensePost ? extractPartyPosition(defensePost.rawText ?? "", "defendant") || makeExcerpt(defensePost.rawText ?? "", 4) : "");
  const legalIssues = extractLegalIssues(first, posts);
  const requestedRelief = extractBlock(first, /Prayer for Relief:?\s*/i, [/\n\s*Verification/i, /\n\s*Evidence/i, /\n\s*Exhibits/i]) || "";
  const finalDecision = finalPost ? extractDecisionText(finalPost.rawText ?? "") : inferOutcomeFromStatus(meta.status);
  const relevance = inferCaseRelevance(source, meta, legalIssues, finalDecision);
  const proceduralHistory = summarizeProceduralHistory(posts);
  const short = makeCaseShort(meta, plaintiffPosition, finalDecision);

  return {
    short,
    plaintiffPosition: compactText(plaintiffPosition),
    defendantPosition: compactText(defendantPosition || "No defense-side argument was confidently isolated. Review the post timeline before treating this as complete."),
    legalIssues,
    requestedRelief: compactText(requestedRelief),
    proceduralHistory,
    finalDecision: compactText(finalDecision),
    relevance,
    finalDecisionPostUrl: finalPost?.postUrl ?? "",
    extractionWarning: "AI draft extracted from forum posts. Verify against captured posts before citation."
  };
}

function makeCaseShort(meta, plaintiffPosition, finalDecision) {
  const caption = [meta.plaintiff, meta.defendant].filter(Boolean).join(" v. ");
  const core = finalDecision && !/No final decision|docket status/i.test(finalDecision) ? finalDecision : plaintiffPosition;
  return `${caption}: ${makeExcerpt(core, 2)}`.slice(0, 700);
}

function findDefensePost(posts) {
  const candidates = posts.slice(1).filter((post) => {
    const text = post.rawText ?? "";
    if (/writ of summons|is required to appear|signed,\s*hon\.|court verdict|appeal verdict/i.test(text)) return false;
    if (/emergency injunction|plaintiff respectfully moves|motion for injunction/i.test(text)) return false;
    return /answer to civil complaint|answer:|position of the defendant|position of the appellee|motion to dismiss|defendant|defen[cs]e|appellee|responds|response/i.test(text);
  });
  return candidates[0] ?? null;
}

function extractPartyPosition(text, side) {
  const labels = side === "plaintiff"
    ? [/Position of the Plaintiff\s*/i, /Plaintiff(?:'s)? Position\s*/i]
    : [/Position of the Defendant\s*/i, /Position of the Appellee\s*/i, /Defendant(?:'s)? Position\s*/i, /Answer to Civil Complaint\s*/i];
  for (const label of labels) {
    const block = extractBlock(text, label, [/\n\s*Position of the Defendant/i, /\n\s*Position of the Appellee/i, /\n\s*Court Opinion/i, /\n\s*Decision/i, /\n\s*Legal Claims/i, /\n\s*Prayer for Relief/i, /\n\s*Verification/i]);
    if (block) return block;
  }
  return "";
}

function extractDecisionText(text) {
  const decisionMatch = [...text.matchAll(/^Decision\s*:?\s*$/gim)].at(-1);
  if (decisionMatch) {
    const decision = compactText(text.slice(decisionMatch.index + decisionMatch[0].length).replace(/\n\s*Signed[\s\S]*$/i, ""));
    if (decision) return decision;
  }
  const opinionMatch = [...text.matchAll(/^Court Opinion\s*:?\s*$/gim)].at(-1);
  if (opinionMatch) {
    const opinion = compactText(text.slice(opinionMatch.index + opinionMatch[0].length).replace(/\n\s*(Decision|Signed)[\s\S]*$/i, ""));
    if (opinion) return opinion;
  }
  const courtOpinion = extractBlock(text, /(?:Appeal Verdict|Court Verdict)\s*:?\s*/i, [/\n\s*Signed/i]);
  return courtOpinion || makeExcerpt(text, 6);
}

function inferImportantPrecedent(title, source, analysis) {
  const normalized = title.toLowerCase();
  const text = collectText(source);
  const rules = [];
  let importance = 0;

  if (/sagg wizard v\. ministry of justice/i.test(title)) {
    importance = 5;
    rules.push("MoJ may administratively enforce misdemeanors, but those determinations are not final or insulated from judicial review.");
    rules.push("A punished person must initiate a timely court challenge; once challenged, MoJ may be expected to present evidence supporting the punishment.");
    rules.push("The burden of proof remains with MoJ and is not converted into a duty for the accused to prove innocence.");
  } else if (/appeal on the matter of aero nox v\. azalea isles.*2025.*cv 15/i.test(title)) {
    importance = 5;
    rules.push("Expedited trials require clear party consent; silence or a scheduling change is not enough to waive witnesses or closing statements.");
    rules.push("Related statutes enacted as part of a broader scheme may need to be interpreted together, not in isolation.");
  } else if (/industrial plot owners v\. azalea isles.*2026.*cv 20/i.test(title) && /appeal/i.test(normalized)) {
    importance = 4;
    rules.push("A defective plaintiff-class filing can be dismissed without prejudice when class members, consent, and payout documentation are missing.");
    rules.push("A party cannot use a constitutional attack on filing rules to bypass those rules in the same defective filing posture.");
  } else if (/jebediah crumplesnatch v\. the .*prime minister/i.test(title)) {
    importance = 4;
    rules.push("Official-capacity relief should be directed at the government, while personal-capacity claims must clearly allege conduct outside official authority.");
    rules.push("A complaint seeking government action and personal damages must distinguish the defendant capacity and remedy theory.");
  } else if (/members of i020 v\. ministry of urban development/i.test(title)) {
    importance = 4;
    rules.push("Mere association with property does not create the same compensatory standing as ownership when fines or eviction risks fall on the owner.");
    rules.push("Plaintiff classes require similar injury, not just a shared relationship to the disputed property.");
  } else if (/anthony org v\. azalea isles.*2026.*cv 15/i.test(title)) {
    importance = 3;
    rules.push("Courts will not adjudicate the constitutionality of a bill that has merely been introduced and not enacted.");
  } else if (/luke thegreatfired v\. lysander lyon/i.test(title)) {
    importance = 3;
    rules.push("Published bills and works done in association with Parliament belong to Parliament under the copyright statute, limiting personal-author standing.");
  } else if (/kimijungun kapteijn v\. registratore/i.test(title)) {
    importance = 3;
    rules.push("Civil complaints must plead a recognized civil cause of action and enough supporting facts; criminal-code references and conclusory allegations are not enough.");
  }

  if (!rules.length && /supreme court/i.test(source.court ?? "") && /appeal|revers|affirm|remand|decline to hear/i.test(text)) {
    importance = 2;
    rules.push("Supreme Court appeal matter. Review final decision for appellate standards before citing.");
  }

  if (!rules.length) return null;
  return {
    importance,
    rules,
    sourcePostUrl: analysis.finalDecisionPostUrl || source.url || "",
    note: "AI-identified precedent candidate. Verify the holding against the decision post before relying on it."
  };
}

function summarizeReference(text, title) {
  return makeExcerpt(text) || `${title} court reference material.`;
}

function makeExcerpt(text, sentences = 2) {
  return compactText(text).split(/(?<=[.!?])\s+/).slice(0, sentences).join(" ").slice(0, sentences > 2 ? 1200 : 420);
}

function compactText(text) {
  return text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function countImages(source) {
  if (source.images) return source.images.length;
  return (source.posts ?? []).reduce((sum, post) => sum + (post.images?.length ?? 0), 0);
}

function makeCitation(type, item, metadata) {
  if (type === "case") return item.title
    .replace(/^Case:\s*/i, "")
    .replace(/^(Pending|Dismissed|Adjourned|Decided|Closed|Filed|Appealed)\s+/i, "")
    .trim();
  if (type === "law") return makeLawCitation(item.title, metadata.ratified);
  return item.title;
}

function makeLawCitation(title, ratified) {
  const year = String(ratified ?? "").match(/\b(20\d{2})\b/)?.[1];
  return `${title}${year ? ` (${year})` : ""}`;
}

function makeOffenseCitation(baseCitation, sectionNumber, subsection) {
  const pinpoint = [sectionNumber, subsection ? `(${subsection})` : ""].filter(Boolean).join("");
  return pinpoint ? `${baseCitation} § ${pinpoint}` : baseCitation;
}

function extractBlock(text, startRegex, endRegexes) {
  const start = text.search(startRegex);
  if (start < 0) return "";
  const afterStart = text.slice(start).replace(startRegex, "");
  const endPositions = endRegexes
    .map((regex) => afterStart.search(regex))
    .filter((position) => position > 0);
  const end = endPositions.length ? Math.min(...endPositions) : afterStart.length;
  return compactText(afterStart.slice(0, end));
}

function extractDefinitions(text) {
  const definitionsBlock = extractBlock(text, /^\d+\.\s+.*Definitions.*$/im, [/^\d+\.\s+/im]);
  const source = definitionsBlock || text;
  return [...source.matchAll(/^\(([a-z0-9.]+)\)\s+["“]?([^"”\n]+)["”]?\s+shall be defined as\s+(.+)$/gim)]
    .map((match) => ({
      term: match[2].trim(),
      definition: compactText(match[3])
    }));
}

function inferEnforcement(text) {
  const agencies = [];
  if (/Ministry of Justice|MoJ|police|law enforcement/i.test(text)) agencies.push("Ministry of Justice / law enforcement");
  if (/Ministry of Urban Development|MUD/i.test(text)) agencies.push("Ministry of Urban Development");
  if (/Parliament|Speaker|Presiding Office/i.test(text)) agencies.push("Parliament / Presiding Office");
  if (/court|judiciar|judge|justice/i.test(text)) agencies.push("Courts / judiciary");
  return agencies.length ? agencies.join("; ") : "Review the act text for enforcement authority.";
}

function inferLawPracticeNotes(title, text) {
  const notes = [];
  if (/misdemeanor|felony|Penalty/i.test(text)) notes.push("Check extracted offenses and penalty language before advising a client or filing charges.");
  if (/warrant|search|seizure|due process|constitution/i.test(text)) notes.push("Likely to raise constitutional or procedural arguments in litigation.");
  if (/appeal|motion|objection|summons|case structure/i.test(text)) notes.push("Useful for filing, procedure, or court practice questions.");
  if (/FOI|Freedom of Information|public information/i.test(text)) notes.push("Useful for public-records requests and response deadlines.");
  if (/contract|business|bank|tax|financial|property|plot/i.test(text)) notes.push("Check related civil, business, property, or financial remedies.");
  return notes.length ? notes : [`Use ${title} as primary source text; confirm amendments and related cases before citation.`];
}

function extractLegalIssues(firstPost, posts) {
  const issues = new Set();
  const legalClaims = extractBlock(firstPost, /Legal Claims:\s*/i, [/\n\s*Prayer for Relief/i, /\n\s*Verification/i, /\n\s*Evidence/i]);
  for (const line of legalClaims.split("\n").map((line) => line.trim()).filter(Boolean)) {
    const cleaned = line.replace(/^[IVX0-9. -]+/, "").trim();
    if (cleaned.length > 5 && cleaned.length < 140) issues.add(cleaned);
  }
  const allText = posts.map((post) => post.rawText ?? "").join("\n");
  const patterns = [
    ["Due process", /due process/i],
    ["Standing", /\bstanding\b/i],
    ["Presumption of innocence", /presumption of innocence|prove (his|their|her) innocence/i],
    ["Search and seizure", /search and seizure|warrantless search|probable cause/i],
    ["Separation of powers", /separation of powers|usurp/i],
    ["Equal treatment", /equal treatment/i],
    ["Freedom of information", /Freedom of Information|FOIA|FOI request/i],
    ["Appeal standard", /appeal|appellant|appellee/i],
    ["Damages or injunctive relief", /damages|injunction|declaratory/i]
  ];
  for (const [label, regex] of patterns) {
    if (regex.test(allText)) issues.add(label);
  }
  return [...issues].slice(0, 8);
}

function findFinalDecisionPost(posts) {
  const decisionWords = /verdict|judg(e)?ment|dismissed|adjourned|final decision|court finds|court orders|appeal is denied|appeal is granted|case is dismissed|motion is granted|motion is denied/i;
  return [...posts].reverse().find((post) => decisionWords.test(post.rawText ?? ""));
}

function inferOutcomeFromStatus(status) {
  if (/dismissed/i.test(status)) return "The docket status indicates the case was dismissed. Review the final court posts for the exact reasoning and order.";
  if (/adjourned/i.test(status)) return "The docket status indicates the case was adjourned. Review the closing court posts for procedural posture.";
  if (/pending/i.test(status)) return "The docket status indicates the case is pending or unresolved in the captured forum record.";
  return "No final decision was automatically identified. Review the docket timeline.";
}

function inferCaseRelevance(source, meta, issues, finalDecision) {
  const text = collectText(source);
  const relevance = [];
  if (meta.court === "Supreme Court") relevance.push("Supreme Court matter; likely more useful for precedent or appellate standards.");
  if (/dismissed/i.test(meta.status)) relevance.push("Useful for dismissal standards, pleading defects, or limits on relief.");
  if (/adjourned/i.test(meta.status)) relevance.push("Procedural value may be limited unless a substantive order was issued.");
  if (/standing/i.test(text)) relevance.push("Relevant to standing requirements.");
  if (/Freedom of Information|FOIA|FOI request/i.test(text)) relevance.push("Relevant to public-records and FOI disputes.");
  if (/search and seizure|warrant|probable cause/i.test(text)) relevance.push("Relevant to search, seizure, and enforcement challenges.");
  if (/due process|presumption of innocence/i.test(text)) relevance.push("Relevant to constitutional criminal procedure.");
  if (issues.length) relevance.push(`Key issues: ${issues.slice(0, 4).join(", ")}.`);
  if (/granted|denied|dismissed|orders/i.test(finalDecision)) relevance.push("Check the final decision section before citing for a holding.");
  return relevance.length ? relevance : ["General relevance requires manual review of the full docket."];
}

function summarizeProceduralHistory(posts) {
  const events = [];
  for (const post of posts) {
    const body = post.rawText ?? "";
    let label = "";
    if (/complaint|criminal information/i.test(body)) label = "Initial filing";
    else if (/summons/i.test(body)) label = "Summons/order";
    else if (/motion/i.test(body)) label = "Motion practice";
    else if (/objection/i.test(body)) label = "Objection";
    else if (/verdict|judg(e)?ment|dismissed|final decision/i.test(body)) label = "Decision";
    if (label) events.push(`${post.date || post.postNumber || "Undated"}: ${label} by ${post.author || "unknown"}`);
  }
  return [...new Set(events)].slice(0, 10);
}

function inferLinks(docs, lawTitles) {
  const docsByTitle = new Map(docs.map((doc) => [doc.title.toLowerCase(), doc]));
  const lawAliases = lawTitles.flatMap((title) => titleAliases(title).map((alias) => ({ title, alias })));
  const caseAliases = docs
    .filter((doc) => doc.type === "case")
    .flatMap((doc) => [doc.title.replace(/^Case:\s*/i, ""), doc.metadata?.caseNumber].filter(Boolean).map((alias) => ({ doc, alias })));
  const links = [];
  for (const doc of docs) {
    if (doc.type !== "case" && doc.type !== "library") continue;
    const haystack = normalizeForMatch(doc.text);
    for (const { title: lawTitle, alias } of lawAliases) {
      if (alias.length > 6 && haystack.includes(normalizeForMatch(alias))) {
        const law = docsByTitle.get(lawTitle.toLowerCase());
        if (law) links.push({ from: doc.id, to: law.id, relationship: "cites" });
      }
    }
    if (doc.type === "case") {
      for (const { doc: citedCase, alias } of caseAliases) {
        if (citedCase.id === doc.id || alias.length < 8) continue;
        if (haystack.includes(normalizeForMatch(alias))) links.push({ from: doc.id, to: citedCase.id, relationship: "references case" });
      }
    }
  }
  return [...new Map(links.map((link) => [`${link.from}|${link.to}|${link.relationship}`, link])).values()];
}

function titleAliases(title) {
  const aliases = new Set([title]);
  aliases.add(title.replace(/^(Business and Contracts|Finance and Economy|Law and Justice|Plots)\s+/i, ""));
  aliases.add(title.replace(/\s+Act$/i, ""));
  for (const alias of [...aliases]) aliases.add(alias.replace(/\s+Act$/i, ""));
  return [...aliases].map((alias) => alias.trim()).filter(Boolean);
}

function normalizeForMatch(value) {
  return String(value ?? "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}
