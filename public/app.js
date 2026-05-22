const state = {
  index: null,
  overrides: { documents: {} },
  view: "all",
  query: "",
  type: "",
  tag: "",
  caseStatus: "",
  selectedId: null,
  editingId: null,
  trainingModuleId: "training:foundation"
};

const els = {
  search: document.querySelector("#searchInput"),
  type: document.querySelector("#typeFilter"),
  caseStatus: document.querySelector("#caseStatusFilter"),
  tag: document.querySelector("#tagFilter"),
  stats: document.querySelector("#statsStrip"),
  results: document.querySelector("#resultsList"),
  detail: document.querySelector("#detail"),
  resultCount: document.querySelector("#resultCount"),
  viewTitle: document.querySelector("#viewTitle"),
  quickTools: document.querySelector("#quickTools"),
  builtAt: document.querySelector("#builtAt")
};

const VIEW_LABELS = {
  all: "Search",
  laws: "Laws",
  cases: "Case Law",
  offenses: "Offense Lookup",
  library: "Court Library",
  templates: "Templates",
  training: "Lawyer Training"
};

const TRAINING_MODULES = [
  {
    id: "training:azalea-system",
    level: "Module 1",
    title: "Azalea Legal System and Sources",
    summary: "The hierarchy of authority, how courts actually use it, and what lawyers should cite first.",
    sections: [
      {
        title: "Authority Stack",
        items: [
          "Constitution: highest source for rights, separation of powers, due process, search and seizure, voting, judicial review, and limits on public entities.",
          "Acts of Parliament: controlling statutory law. The Guiding Principles say statutes supersede common law where they exist.",
          "Court decisions: practical application of the law. Supreme Court appeal rulings are strongest for procedure, interpretation, and precedent.",
          "Guiding Principles: common law used to fill gaps. They cover contracts, criminal burden, evidence, property, damages, and constitutional interpretation.",
          "Court Library: procedural source for case structure, motions, objections, appeals, court orders, parties, and class actions."
        ]
      },
      {
        title: "How Azalea Courts Think",
        items: [
          "Azalea courts repeatedly reject lawsuits that skip threshold issues: standing, proper defendant, proper procedural posture, recognized civil cause of action, and evidence.",
          "A court may recognize a serious constitutional question but still dismiss if the wrong party was named or the filing posture is defective.",
          "Dismissal without prejudice is often a procedural lesson, not a merits loss. It usually means the claim may be refiled correctly.",
          "A lawyer should always identify whether the client needs a complaint, answer, motion, objection, FOIA suit, misdemeanor challenge, or appeal."
        ]
      },
      {
        title: "Lawyer Conduct Standard",
        items: [
          "Every complaint and answer is verified. Do not exaggerate facts, invent harm, or convert assumptions into evidence.",
          "A lawyer's first job is to narrow the dispute: who harmed whom, what law was breached, what proof exists, and what order the court can grant.",
          "Use database AI summaries as orientation. Cite the statute text, final decision post, court order, or captured docket language.",
          "When authority conflicts, explain why one source controls: constitutional supremacy, statutory supersession, Supreme Court precedent, or common-law gap filling."
        ]
      }
    ],
    drills: [
      "Given a client story, identify the controlling source: Constitution, statute, case, Guiding Principle, or Court Library procedure.",
      "Write a one paragraph intake memo that separates facts, law, evidence, remedy, and procedural vehicle."
    ]
  },
  {
    id: "training:intake-standing",
    level: "Module 2",
    title: "Intake, Standing, Parties, and Capacity",
    summary: "The most common Azalea failure point: filing against the wrong person, with the wrong injury, in the wrong posture.",
    sections: [
      {
        title: "Standing Questions",
        items: [
          "Direct injury: the client must be affected personally or as a valid member of a properly pleaded class.",
          "Legal wrong: the facts must violate a statute, constitutional protection, contract, court-recognized principle, or legally enforceable duty.",
          "Timeliness: Court Reformation Act §6.h adds a two-month limit for civil compensation claims; late filings automatically lack standing.",
          "Ownership matters: Members of i020 v. MUD held that added property members did not share the same compensatory injury as the owner exposed to fines or eviction.",
          "Statutory ownership matters: Luke Thegreatfired v. Lysander Lyon held that parliamentary works vested in Parliament, not the individual author, defeating personal standing."
        ]
      },
      {
        title: "Proper Defendant and Capacity",
        items: [
          "For official government action, name the Azalea Isles Government or responsible ministry when seeking official relief.",
          "Jebediah Crumplesnatch v. The \"Prime Minister\" dismissed because the complaint mixed personal claims against the Prime Minister with government remedies like reinstatement.",
          "Personal-capacity claims must explain how the official acted outside official duties or personally caused the wrong.",
          "Official-capacity claims should request official remedies: injunction, reinstatement, policy change, declaration, expungement, or agency action.",
          "If the requested order binds an office, ministry, or government function, the caption and party section must match that remedy."
        ]
      },
      {
        title: "Class Actions",
        items: [
          "Civil Suit Reform Act treats a class as one party, but the class must be valid before it can proceed.",
          "Plaintiff classes require common characteristic/common injury, identified members, agreement to be part of the class, one legal representative, and agreed payout terms.",
          "Industrial Plot Owners v. Azalea Isles was dismissed without prejudice because the plaintiff class was undefined and lacked member list, consent, and payout agreement.",
          "The Industrial Plot Owners appeal confirmed that broader constitutional objections to class-action rules must be raised in a proper posture, not used to bypass an invalid filing."
        ]
      }
    ],
    drills: [
      "For a government overreach complaint, draft two captions: one official-capacity and one personal-capacity. Explain which remedies fit each.",
      "Take a group of property users and decide who has owner-level injury, who has lesser association, and whether a class is certifiable."
    ]
  },
  {
    id: "training:pleadings",
    level: "Module 3",
    title: "Pleadings, Claims, and Remedies",
    summary: "How to draft an Azalea complaint that survives first review and gives the judge something lawful to order.",
    sections: [
      {
        title: "Required Complaint Logic",
        items: [
          "Caption: plaintiff v. defendant, with correct government, ministry, company, individual, or class party.",
          "Civil Complaint summary: a short statement of what happened and why it is legally actionable.",
          "Parties: identify plaintiff, defendant, co-defendants, third parties, and capacities.",
          "Factual allegations: date, time, location, screenshots, tickets, messages, votes, charges, or government action.",
          "Legal claims: connect each factual allegation to a statute, constitutional right, contract duty, court precedent, or Guiding Principle.",
          "Prayer for relief: request a specific court order, not a general complaint that the court should fix everything."
        ]
      },
      {
        title: "Recognized Civil Claim Problem",
        items: [
          "Kimijungun Kapteijn v. Registratore (CV 13) is the warning case: a civil complaint cannot rely mostly on criminal assault language and conclusory wrongdoing.",
          "The court dismissed CV 13 before summons because the complaint did not plead a recognized civil cause of action or enough corroborating evidence for intent, paralysis, emotional harm, or physical harm.",
          "If conduct resembles a crime, decide whether your client has a civil remedy too: compensatory damages, property loss, injunction, declaratory relief, expungement, or constitutional injury.",
          "Do not ask for unserious or legally unsupported relief; CV 13 treated the prayer for relief as part of why the case was not serious."
        ]
      },
      {
        title: "Remedy Discipline",
        items: [
          "Damages must match proven harm. Tomasi Latutupou v. Blogy Wogy found copyright-capable work but denied relief because damages or harm were not sufficiently shown.",
          "Injunctions must be tied to future or ongoing harm and be narrow enough for the court to enforce.",
          "Declaratory relief is useful when the client needs a legal interpretation, such as whether a ministry has authority.",
          "Expungement/removal relief should identify the charge, record, audit, policy, or posting to be changed.",
          "Court costs, witness costs, and legal fees should be supported by the relevant cost authority and the actual procedural work done."
        ]
      }
    ],
    drills: [
      "Rewrite a criminal-code-based civil complaint into a recognized civil theory with facts, evidence, and remedy.",
      "For each requested remedy, write the exact defendant who can comply with it."
    ]
  },
  {
    id: "training:motions-evidence",
    level: "Module 4",
    title: "Motions, Objections, Evidence, and Hearings",
    summary: "Practical procedure for controlling the record, preserving rights, and avoiding surprise trial structures.",
    sections: [
      {
        title: "Motions vs. Objections",
        items: [
          "Motions request court action: dismiss, reconsider, strike, compel, add counsel, injunction, default judgment, subpoena, or stay.",
          "Objections challenge a question, exhibit, testimony, or procedure during a hearing or trial.",
          "Motion appeal and objection appeal require more than error; the error must significantly influence the outcome.",
          "If a judge creates unclear procedure, ask for clarification immediately and preserve the issue."
        ]
      },
      {
        title: "Evidence Rules in Practice",
        items: [
          "Screenshots prove only what they show. Add context: who took it, where it occurred, date/time, relevant UI, and why it satisfies a legal element.",
          "Azalea Isles v. Krix shows that crime-watcher evidence may prove use of a command or intent, but the court still asks whether facts satisfy the statutory crime definition.",
          "Death Thegreatfired v. Azalea Isles (pending CV 24) shows statements in argument are not evidence unless supported by witness testimony or proof later.",
          "For government evidence, check search/seizure, warrant, probable cause, privilege, and fruit-of-the-poisonous-tree issues.",
          "For FOIA or ministry disputes, preserve ticket history, timestamps, records requested, refusal language, and what office responded."
        ]
      },
      {
        title: "Default and Nonresponse",
        items: [
          "Default judgments have repeatedly issued when defendants fail to answer: Multi Man v. Carrot Guy, Iturgen Bolir v. Gaven Carnahan, Vanguard/Nexus Bank matters, and several early criminal cases.",
          "A defendant merely appearing is not enough if the court orders an answer and no answer is filed.",
          "Default may still require the plaintiff to support damages and fees; Multi Man prorated legal fees rather than granting every waiting day requested.",
          "Plaintiffs can also lose for nonresponse: Omreta_Bank was dismissed when the government did not respond; Robi Hawes appeal was not heard after missed deadlines."
        ]
      }
    ],
    drills: [
      "Draft a motion to dismiss for failure to plead a recognized civil claim.",
      "Create an evidence table with exhibit, fact proved, legal element, and possible objection."
    ]
  },
  {
    id: "training:criminal",
    level: "Module 5",
    title: "Criminal Defense, Tickets, and Enforcement",
    summary: "Azalea-specific criminal practice after the New Criminal Code and Sagg Wizard misdemeanor doctrine.",
    sections: [
      {
        title: "Misdemeanor Administration",
        items: [
          "Sagg Wizard v. MoJ held that the New Criminal Code allows MoJ/police administrative handling of misdemeanors because requiring court cases for every minor offense would be unworkable.",
          "The same decision also held that administrative handling is not final guilt insulated from judicial review.",
          "A punished person must initiate a timely civil court challenge if they contest the administrative punishment.",
          "Once the challenge is validly before court, MoJ may be expected to produce evidence supporting the punishment.",
          "The accused does not carry a burden to prove innocence; the burden of proof remains with the state."
        ]
      },
      {
        title: "Administrative Appeal Trap",
        items: [
          "Dismissed Appeal on the Matter of MoJ v. Sagg Wizard held that a direct appeal of an MoJ administrative misdemeanor ruling was impermissible without a statutory appeal framework.",
          "The correct path identified was a civil complaint against MoJ for judicial review of the administrative determination.",
          "If Parliament later creates a statutory administrative appeal route, lawyers must update this workflow."
        ]
      },
      {
        title: "Elements and Proof",
        items: [
          "Always identify offense name, offense type, penalty, repeat-offense schedule, and elements.",
          "Compare evidence to each element. A charge title is not enough.",
          "Azalea Isles v. Galavance found conduct questionable but not proven beyond reasonable doubt for corruption/treason.",
          "Azalea Isles v. Krix treated command evidence as relevant but still required facts to satisfy the statutory robbery definition.",
          "For self-defense, duress, insanity, privilege, or improper evidence, tie the defense to the Guiding Principles and specific facts."
        ]
      }
    ],
    drills: [
      "For a misdemeanor ticket, write the proper civil complaint path for review and list what MoJ must prove.",
      "Take one offense from the Offense Lookup and build a proof chart for every element."
    ]
  },
  {
    id: "training:government-rights",
    level: "Module 6",
    title: "Government, Rights, FOIA, and Public Power",
    summary: "How to litigate against ministries, Parliament, executive offices, and government records decisions.",
    sections: [
      {
        title: "Executive and Ministry Authority",
        items: [
          "Aero Nox v. Ministry of State (CV 14) held that MOS could not conduct or publish formal executive audits of Members of Parliament without explicit statutory authorization.",
          "The CV 14 remedy was narrow: existing audits could remain, but MOS Audit Policy had to be amended and formal audits could not continue absent authority.",
          "Jebediah Crumplesnatch v. The \"Prime Minister\" teaches that government overreach claims must be directed at the correct official/government defendant.",
          "Anthony Org v. Azalea Isles (CV 12) rejected relief aimed at a parliamentary vote where the plaintiff did not prove the governmental action was the deployment theory alleged."
        ]
      },
      {
        title: "Judicial Review Limits",
        items: [
          "Anthony Org v. Azalea Isles (CV 15) dismissed a challenge to a bill still under debate. Courts review enacted laws and concrete actions, not possible future statutes.",
          "Courts can leave important questions open when the case posture is wrong. Industrial Plot Owners appeal left the broader Civil Suit Reform Act constitutional issue for a separate proper case.",
          "Vontobel v. MUD ruled for the defendant but expressly did not close whether Raze could bring a separate contract/property claim over plot seizure.",
          "If you want constitutional review, plead a concrete harm from an enacted law or official act, not a generalized fear of what government might do."
        ]
      },
      {
        title: "FOIA and Records",
        items: [
          "FOIA requests must go to a Responding Office: Ministry, Office of the Prime Minister, or Presiding Office of Parliament.",
          "Requests must be narrow and targeted, including specific topic and reasonable date range.",
          "The responding office has at least one week to address the request before timeliness litigation is normally appropriate.",
          "Classified information cannot be compelled through FOIA, but courts may review withheld information to determine classification.",
          "Anthony Org v. MoJ (CV 03) is a reminder that FOIA suits still need standing, proof, timeliness, and a clear records dispute."
        ]
      }
    ],
    drills: [
      "Convert a broad FOIA demand into a narrow request with topic, date range, and proper responding office.",
      "Draft a government-overreach issue statement that names the exact authority the ministry lacks."
    ]
  },
  {
    id: "training:appeals",
    level: "Module 7",
    title: "Appeals, Preservation, and Complex Litigation",
    summary: "How to choose the right appeal route and preserve issues before the verdict.",
    sections: [
      {
        title: "Appeal Types and Timing",
        items: [
          "Interlocutory appeal: during trial, only where waiting until verdict would cause urgent or irreparable harm.",
          "Motion appeal: after verdict, challenges a motion ruling and must show the ruling was wrong and significantly influenced outcome.",
          "Objection appeal: after verdict, challenges an objection ruling and must show meaningful impact.",
          "Verdict appeal: after verdict, argues the final outcome does not reflect evidence, law, or reasonable factual interpretation.",
          "Court Reformation Act requires non-interlocutory appeals no later than one week after trial ends."
        ]
      },
      {
        title: "Preservation Lessons",
        items: [
          "Aero Nox appeal, CV 15: expedited trials require clear party consent; silence or confusion is not enough to waive witnesses and closing statements.",
          "The same appeal warns that courts should consider related statutes as part of one scheme where the statutes are interdependent.",
          "Robi Hawes appeal: extensions in the interests of justice are not unlimited; missed appellate deadlines can cause the Supreme Court to decline review and sanction conduct.",
          "Industrial Plot Owners appeal: a motion/sua sponte dismissal appeal must explain how the District Court misapplied the law, not merely argue broad constitutional theory."
        ]
      },
      {
        title: "Building an Appeal Argument",
        items: [
          "Identify the exact ruling challenged: motion, objection, verdict, injunction, suppression, dismissal, or procedural order.",
          "State the legal standard from Court Reformation Act and the Appeals guide.",
          "Explain why the error mattered to the result or trial fairness.",
          "Request a remedy: affirm, reverse, remand with corrections, lift injunction, restore evidence, or reconsider with proper procedure."
        ]
      }
    ],
    drills: [
      "Classify ten possible appellate issues by appeal type.",
      "Write a preservation objection when a judge proposes expedited handling without party consent."
    ]
  },
  {
    id: "training:precedents",
    level: "Module 8",
    title: "Precedents Lawyers Must Know",
    summary: "A full-archive precedent digest: only cases with useful holdings, procedural rules, or recurring lawyer lessons.",
    sections: [
      {
        title: "Procedure, Pleading, and Parties",
        items: [
          "Jebediah Crumplesnatch v. The \"Prime Minister\": official-capacity government relief should be sought against the government or proper ministry; personal claims need conduct outside official duties.",
          "Kimijungun Kapteijn v. Registratore (CV 13): civil pleadings must state a recognized civil cause of action and corroborated harm; criminal-code references alone are insufficient.",
          "Members of i020 v. MUD: class plaintiffs must share similar injury; property association is not the same as ownership injury.",
          "Industrial Plot Owners v. Azalea Isles and appeal: plaintiff class filings need identified members, consent, and payout agreement; defective filings may be dismissed without prejudice.",
          "Luke Thegreatfired v. Lysander Lyon: no personal copyright standing where statute automatically vests parliamentary works in Parliament.",
          "Multi Man v. Carrot Guy: default can support judgment, but legal fees may be prorated to work actually performed."
        ]
      },
      {
        title: "Constitutional and Government Power",
        items: [
          "Aero Nox v. Ministry of State (CV 14): executive audits of MPs require explicit statutory authority; relief was limited to formal audits/policy compliance.",
          "Anthony Org v. Azalea Isles (CV 15): courts will not review constitutionality of bills merely introduced and under debate.",
          "Anthony Org v. Azalea Isles (CV 12): a plaintiff must prove the challenged government action matches the legal theory; a vote alone was not enough for the deployment theory argued.",
          "Crumplesnatch v. Azalea Isles (CV 02): court granted limited relief over a parliamentary tie-breaking vote while leaving broader legislative resolution to the political branch.",
          "Vontobel v. MUD: losing one theory does not bar a separate properly framed contract/property claim by the right party."
        ]
      },
      {
        title: "Criminal and Enforcement",
        items: [
          "Sagg Wizard v. MoJ: MoJ may administratively enforce misdemeanors, but not as final unreviewable judge of guilt; court challenge remains available.",
          "MoJ v. Sagg Wizard appeal: direct appeal of MoJ administrative misdemeanor rulings is impermissible absent statutory framework; use civil complaint review.",
          "Azalea Isles v. Galavance: questionable political conduct was not enough for corruption/treason without proof beyond reasonable doubt.",
          "Azalea Isles v. Krix: prosecution must satisfy statutory crime definitions, not merely prove intent or command activity.",
          "Azalea Isles v. OCG: sentencing can account for recognition of wrongdoing and deterrence; dismissal may still include payment terms."
        ]
      },
      {
        title: "Civil Remedies, Property, Finance, and IP",
        items: [
          "Tomasi Latutupou v. Blogy Wogy: copyright-capable work does not guarantee relief without sufficient damages or harm.",
          "Liam Wolfe v. Chris West: tenant obstruction can support fines, fees, legal fees, and court-ordered refund-style relief rather than the exact injunction requested.",
          "Nim Surname v. Vanguard National Bank: wrongful account freeze can support unfreezing funds, legal fees, court costs, and contempt referral for nonresponse.",
          "White Shadow & Benjamin Higgins v. Skibidi Fart: special/compensatory costs such as bus tickets can be awarded when tied to defendant-caused loss.",
          "fluffywaafelz v. ko531: robbery-related civil loss can support limited financial recovery matching proven loss."
        ]
      },
      {
        title: "Appeals and Court Discipline",
        items: [
          "Aero Nox appeal, CV 15: reversible error where expedited structure lacked clear consent and impaired witnesses/closing statements.",
          "Aero Nox appeal, CV 15: statutory interpretation may require the full electoral law package, not isolated reading of one clause.",
          "Industrial Plot Owners appeal: Supreme Court may decline review where dismissal without prejudice leaves an adequate refiling path.",
          "Robi Hawes appeal: repeated missed deadlines can end appeal despite prior extensions; appellate parties must respect court time.",
          "Omreta_Bank and other nonresponse dismissals/defaults: both plaintiffs and defendants can lose procedural position by failing to respond."
        ]
      }
    ],
    drills: [
      "Pick one precedent from each category and write: rule, facts that matter, limit, and how to cite it.",
      "Given a new client issue, identify whether the closest precedent helps, hurts, or is distinguishable."
    ]
  }
];

const TEMPLATE_MODULES = [
  {
    id: "template:civil-complaint",
    level: "Court Filing",
    title: "Civil Complaint",
    summary: "Formal Azalea case filing structure for a plaintiff starting a civil case.",
    source: "Case Structure; Case Structure Formalization Act",
    whenToUse: [
      "Use when a client has standing, a direct injury, and a legally actionable wrong.",
      "Best for damages, injunctions, declaratory relief, contract claims, property disputes, government-rights claims, and other civil causes.",
      "Do not file until the defendant, legal claim, factual allegations, requested remedy, and verification are all complete."
    ],
    template: [
      "Thread Title: [Plaintiff's Name] v. [Defendant's Name]",
      "",
      "Thread Body:",
      "",
      "[Plaintiff's Name], Plaintiff",
      "v.",
      "[Defendant's Name], Defendant",
      "",
      "Civil Complaint:",
      "[Short summary of the complaint.]",
      "",
      "Parties:",
      "Plaintiff - [name and role/injury]",
      "Defendant - [name and legal relationship to the dispute]",
      "Co-Defendant(s) - [if any]",
      "Third Parties - [if any]",
      "",
      "Factual Allegations:",
      "1. [Date/time/location if known.]",
      "2. [What happened.]",
      "3. [How the plaintiff was directly affected.]",
      "4. [Evidence available: screenshots, contracts, logs, witnesses, admissions.]",
      "",
      "Legal Claims:",
      "1. [Cause of action or statute/constitutional provision violated.]",
      "2. [Apply the facts to the legal requirement.]",
      "",
      "Prayer for Relief:",
      "The Plaintiff requests that the Court grant [damages / injunction / declaratory judgment / mandamus / expungement / other order].",
      "",
      "Verification:",
      "I, [name], hereby affirm that the allegations in the complaint AND all subsequent statements made in court are true and correct to the best of the plaintiff's knowledge, information, and belief and that any falsehoods may bring the penalty of perjury."
    ],
    checklist: [
      "Standing is explicit: direct injury plus legal wrong.",
      "Caption matches the remedy. Official relief goes against the proper government/ministry defendant.",
      "Legal Claims name actual law or recognized cause, not just broad unfairness.",
      "Prayer for Relief asks for an order the court can actually grant.",
      "Verification is included."
    ]
  },
  {
    id: "template:answer",
    level: "Defense Filing",
    title: "Answer to Civil Complaint",
    summary: "Defendant response structure for admitting, denying, and legally challenging a complaint.",
    source: "Case Structure",
    whenToUse: [
      "Use after summons or court direction requires the defendant to answer the complaint.",
      "Use to preserve factual defenses, standing defects, wrong-party arguments, and legal challenges.",
      "Pair with a motion if the defect can resolve the case before full trial."
    ],
    template: [
      "Thread Body:",
      "",
      "Answer to Civil Complaint:",
      "[Short summary of the defense position.]",
      "",
      "Parties:",
      "Plaintiff - [copy/confirm or dispute identification]",
      "Defendant - [copy/confirm or dispute identification]",
      "Co-Defendant(s) - [if any]",
      "Third Parties - [if any]",
      "",
      "Factual Defenses or Challenges:",
      "1. [Facts admitted.]",
      "2. [Facts denied.]",
      "3. [Missing context or alternative account.]",
      "4. [Evidence and witnesses supporting the defense.]",
      "",
      "Legal Defenses or Challenges:",
      "1. [Standing / timeliness / wrong defendant / no cause of action / immunity / statutory defense.]",
      "2. [Apply defense law to the complaint facts.]",
      "",
      "Requested Outcome:",
      "The Defendant requests [dismissal / denial of relief / narrowed issues / other order].",
      "",
      "Verification:",
      "I, [name], hereby affirm that the allegations in the answer AND all subsequent statements made in court are true and correct to the best of the defendant's knowledge, information, and belief and that any falsehoods may bring the penalty of perjury."
    ],
    checklist: [
      "Responds to both facts and law, not only broad denials.",
      "Separates factual disputes from legal defenses.",
      "Raises threshold defenses early: standing, limitation period, wrong party, defective class, non-actionable claim.",
      "Includes evidence or identifies what evidence will be produced.",
      "Verification is included."
    ]
  },
  {
    id: "template:motion",
    level: "Court Request",
    title: "Motion",
    summary: "General motion format for asking the court for an order, ruling, sanction, dismissal, default, or procedural relief.",
    source: "Motions and Objections",
    whenToUse: [
      "Use when a party needs the court to decide a specific procedural or legal issue before final verdict.",
      "Common uses: dismiss, default judgment, vacate default, summary judgment, substitute counsel, sanctions, reconsideration, suppress evidence, recusal, strike, expedited hearing, bifurcation.",
      "A motion should state the requested order, the legal reason, the facts supporting it, and the practical effect on the case."
    ],
    template: [
      "In the Court of the Azalea Isles",
      "",
      "Motion to [Requested Relief]",
      "",
      "Movant:",
      "[Party filing the motion.]",
      "",
      "Requested Order:",
      "[Exactly what the court should grant.]",
      "",
      "Grounds:",
      "1. [Legal rule, statute, court order, or procedural principle.]",
      "2. [Facts showing the rule applies.]",
      "3. [Why the requested order is proper now.]",
      "",
      "Effect on the Case:",
      "[Dismisses case / narrows issues / excludes evidence / changes schedule / imposes sanction / other effect.]",
      "",
      "Conclusion:",
      "For these reasons, [party] respectfully requests that the Court [grant specific relief]."
    ],
    checklist: [
      "The motion asks for one clear thing.",
      "The requested order is within the court's powers.",
      "The facts are tied to record evidence or docket events.",
      "If seeking default, the response deadline has actually passed.",
      "If seeking expedited hearing, party consent and waiver issues are clear after Aero Nox appeal."
    ]
  },
  {
    id: "template:objection",
    level: "Trial Tool",
    title: "Objection",
    summary: "Trial objection format and objection grounds extracted from the Court Library.",
    source: "Motions and Objections",
    whenToUse: [
      "Use during questioning, evidence submission, or argument when a party believes the court should stop or limit improper material.",
      "Common grounds: hearsay, relevance, speculation, leading, repetitive, compound, argumentative, conclusory, improper opinion, assumes facts not in evidence, unresponsive answer, privileged communication.",
      "Objections should be short, specific, and tied to the question, answer, exhibit, or argument being challenged."
    ],
    template: [
      "In the Court of the Azalea Isles",
      "",
      "Objection: [Ground]",
      "",
      "Target:",
      "[Question / answer / exhibit / argument being objected to.]",
      "",
      "Ground:",
      "[Hearsay / relevance / speculation / leading / repetitive / compound / argumentative / conclusory / improper opinion / assumes facts not in evidence / unresponsive / privileged communication.]",
      "",
      "Reason:",
      "[One or two sentences explaining why the ground applies.]",
      "",
      "Requested Ruling:",
      "[Sustain the objection / strike the answer / exclude the exhibit / require rephrasing / limit testimony.]"
    ],
    checklist: [
      "Names the specific objection ground.",
      "Identifies the exact question, answer, exhibit, or argument.",
      "Explains prejudice or why the material is improper.",
      "Requests a concrete ruling.",
      "Preserves the issue if an objection appeal may later be needed."
    ]
  },
  {
    id: "template:appeal-request",
    level: "Appeal Filing",
    title: "Appeal Request",
    summary: "Initial request for Supreme Court review after a ruling, motion, objection, verdict, or urgent interlocutory issue.",
    source: "Appealing a Case",
    whenToUse: [
      "Use in the same case thread when asking for appellate review.",
      "Choose one appeal type: interlocutory, motion, objection, or verdict appeal.",
      "Appeals do not retry the case; they argue legal error, unfair procedure, unsupported verdict, or significant effect on the outcome."
    ],
    template: [
      "I, [Name], am requesting review of the ruling made by the District Court of Azalea on the [type of ruling].",
      "",
      "Appeal Type:",
      "[Interlocutory Appeal / Motion Appeal / Objection Appeal / Verdict Appeal]",
      "",
      "Ruling Being Appealed:",
      "[Identify the verdict, motion ruling, objection ruling, or urgent mid-case order.]",
      "",
      "Error:",
      "[Explain what the lower court got wrong legally or procedurally.]",
      "",
      "Significance:",
      "[Explain why the error affected the outcome or creates irreparable harm if not reviewed immediately.]",
      "",
      "Requested Appellate Relief:",
      "[Affirm/reverse/remand/vacate/narrow order or other relief.]"
    ],
    checklist: [
      "Appeal type is identified.",
      "The specific ruling is identified.",
      "For motion or objection appeals, explains significant influence on the case outcome.",
      "For verdict appeals, points to evidence, law, or interpretation error.",
      "For interlocutory appeals, shows urgency and irreparable harm."
    ]
  },
  {
    id: "template:aws-warrant",
    level: "Statutory Warrant",
    title: "AWS Warrant Request",
    summary: "Autonomous Weapons Control Act warrant structure for MUD or MoJ seeking AWS search and confiscation authority.",
    source: "Autonomous Weapons Control Act, Section 11",
    whenToUse: [
      "Use when MUD, or MoJ on MUD's behalf, seeks authority to search property for unauthorized AWS devices.",
      "The reviewing judge grants or denies based on probable cause, described as reasonable belief.",
      "Do not combine multiple property owners in one request; multiple properties of one owner may be included only if probable cause supports all properties."
    ],
    template: [
      "Thread Title: Ministry of Urban Development v. [Property Owner's Name, Plot or Rental Region Name/Number]",
      "",
      "Thread Body:",
      "",
      "Ministry of Urban Development, Requesting Authority",
      "v.",
      "[Property Owner's Name], Subject",
      "",
      "Parties:",
      "Plaintiff - Ministry of Urban Development, represented by [Counsel's Name]",
      "Defendant - [Property Owner's Name]",
      "Plot In Question - [Plot or Rental Region Name/Number]",
      "",
      "Warrant Request:",
      "[Summarize why MUD believes an unauthorized AWS device is present on property.]",
      "",
      "Factual Allegations:",
      "[Facts supporting probable cause for each property.]",
      "",
      "Verification:",
      "I, [MUD Counsel's Name], hereby affirm that the allegations in the request AND all subsequent statements made in court are true and correct to the best of the government's knowledge, information, and belief and that any falsehoods may bring the penalty of perjury."
    ],
    checklist: [
      "Names one property owner only.",
      "Identifies every plot or rental region in question.",
      "States facts supporting probable cause for each property.",
      "Requests both search permission and confiscation authority if unauthorized devices are found.",
      "Verification is included."
    ]
  },
  {
    id: "template:resolution",
    level: "Parliamentary Form",
    title: "Resolution",
    summary: "Parliamentary Procedure Act resolution format for non-binding opinions, requests, or recognition.",
    source: "Parliamentary Procedure Act; Resolutions Act amendment",
    whenToUse: [
      "Use for a non-binding parliamentary opinion, request, or recognition toward an individual, entity, or nation.",
      "Resolutions follow bill proposal, formatting, and voting processes but do not create binding law.",
      "Useful for lawyers advising MPs, public bodies, or organizations on parliamentary requests."
    ],
    template: [
      "Author: <NAME> MP",
      "Sponsor: <NAME OF SPONSOR, OR N/A>",
      "Recipient: <NAME OF ENTITY YOU ARE MAKING REQUEST TOWARD>",
      "",
      "A",
      "Resolution",
      "TO",
      "<PURPOSE OF THE RESOLUTION>",
      "",
      "Preamble: <REASONS WHY YOU SHOULD VOTE FOR THE RESOLUTION AND EXPLAINING WHAT IT DOES>",
      "",
      "Resolution Text: <TEXT DESCRIBING THE OPINION OR REQUEST TOWARDS AN INDIVIDUAL, ENTITY, OR NATION>"
    ],
    checklist: [
      "Author and sponsor are listed.",
      "Recipient is identified.",
      "Purpose is specific.",
      "Preamble explains why Parliament should adopt it.",
      "Resolution text is non-binding and does not pretend to amend law."
    ]
  }
];

init();

async function init() {
  const [indexResponse, overridesResponse] = await Promise.all([
    fetch("/data/legal-index.json"),
    fetch("/api/overrides").catch(() => null)
  ]);
  state.index = await indexResponse.json();
  state.overrides = overridesResponse?.ok ? await overridesResponse.json() : { documents: {} };
  applyOverrides();
  state.selectedId = state.index.documents[0]?.id ?? null;
  renderTagOptions();
  bindEvents();
  render();
}

function bindEvents() {
  els.search.addEventListener("input", () => {
    state.query = els.search.value.trim();
    state.selectedId = null;
    render();
  });
  els.type.addEventListener("change", () => {
    state.type = els.type.value;
    if (state.type !== "case") state.caseStatus = "";
    state.selectedId = null;
    render();
  });
  els.caseStatus.addEventListener("change", () => {
    state.caseStatus = els.caseStatus.value;
    if (state.caseStatus) {
      state.view = "cases";
      state.type = "case";
      els.type.value = "case";
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === "cases"));
    }
    state.selectedId = null;
    render();
  });
  els.tag.addEventListener("change", () => {
    state.tag = els.tag.value;
    state.selectedId = null;
    render();
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.view = button.dataset.view;
      state.type = state.view === "laws" ? "law" : state.view === "cases" ? "case" : state.view === "library" ? "library" : "";
      state.caseStatus = state.view === "cases" ? state.caseStatus : "";
      els.type.value = state.type;
      els.caseStatus.value = state.caseStatus;
      state.selectedId = null;
      render();
    });
  });
}

function renderTagOptions() {
  els.tag.innerHTML = `<option value="">All topics</option>${state.index.tags.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(titleCase(tag))}</option>`).join("")}`;
}

function render() {
  renderStats();
  renderQuickTools();
  document.querySelector(".content-grid")?.classList.toggle("is-training", state.view === "training" || state.view === "templates");
  els.caseStatus.hidden = !(state.view === "cases" || state.type === "case");
  els.caseStatus.value = state.caseStatus;
  const results = currentResults();
  if (!results.some((doc) => doc.id === state.selectedId)) state.selectedId = results[0]?.id ?? null;
  els.viewTitle.textContent = VIEW_LABELS[state.view] ?? "Search";
  els.resultCount.textContent = `${results.length} result${results.length === 1 ? "" : "s"}`;
  els.results.innerHTML = results.map((doc) => resultButton(doc)).join("") || `<div class="empty-detail">No matching records.</div>`;
  els.results.querySelectorAll(".result").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      render();
    });
  });
  renderDetail(results);
}

function renderStats() {
  const stats = state.index.stats;
  els.builtAt.textContent = `Built ${new Date(stats.builtAt).toLocaleString()}`;
  els.stats.innerHTML = [
    ["Laws", stats.laws],
    ["Cases", stats.cases],
    ["Library", stats.library],
    ["Offenses", state.index.offenses.length],
    ["Posts", stats.posts],
    ["Images", stats.images]
  ].map(([label, value]) => `<div class="stat"><strong>${Number(value).toLocaleString()}</strong><span>${label}</span></div>`).join("");
}

function renderQuickTools() {
  if (state.view === "training") {
    els.quickTools.innerHTML = `<span class="training-note">Practical modules compiled from court library guidance, recurring case failures, and major precedents.</span>`;
    return;
  }
  if (state.view === "templates") {
    els.quickTools.innerHTML = `<span class="training-note">Extracted drafting forms from court library pages and laws. Use the database views for the source text behind each form.</span>`;
    return;
  }
  const tools = [
    ["criminal law", "Criminal"],
    ["court procedure", "Procedure"],
    ["templates", "Templates"],
    ["public records", "FOIA"],
    ["property", "Property"],
    ["finance", "Finance"]
  ];
  els.quickTools.innerHTML = tools.map(([tag, label]) => `<button class="tool-button" data-tag="${escapeHtml(tag)}">${escapeHtml(label)}</button>`).join("");
  els.quickTools.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.tag = button.dataset.tag;
      els.tag.value = state.tag;
      state.selectedId = null;
      render();
    });
  });
}

function currentResults() {
  if (state.view === "training") return trainingModules();
  if (state.view === "templates") return templateModules();
  if (state.view === "offenses") return offenseDocuments();
  let docs = state.index.documents;
  if (state.type) docs = docs.filter((doc) => doc.type === state.type);
  if ((state.view === "cases" || state.type === "case") && state.caseStatus) docs = docs.filter((doc) => doc.status === state.caseStatus);
  if (state.tag) docs = docs.filter((doc) => doc.tags.includes(state.tag));
  if (state.query) docs = scoreDocs(docs, state.query);
  return docs.slice(0, 250);
}

function trainingModules() {
  if (!state.query) return TRAINING_MODULES;
  const query = state.query.toLowerCase();
  return TRAINING_MODULES.filter((module) => {
    const text = `${module.level} ${module.title} ${module.summary} ${module.sections.flatMap((section) => [section.title, ...section.items]).join(" ")} ${module.drills.join(" ")}`.toLowerCase();
    return text.includes(query);
  });
}

function templateModules() {
  if (!state.query) return TEMPLATE_MODULES;
  const query = state.query.toLowerCase();
  return TEMPLATE_MODULES.filter((module) => {
    const text = `${module.level} ${module.title} ${module.summary} ${module.source} ${module.whenToUse.join(" ")} ${module.template.join(" ")} ${module.checklist.join(" ")}`.toLowerCase();
    return text.includes(query);
  });
}

function offenseDocuments() {
  const query = state.query.toLowerCase();
  return state.index.offenses
    .filter((offense) => {
      const haystack = `${offense.name} ${offense.offenseType} ${offense.penalty} ${offense.elements} ${offense.lawTitle}`.toLowerCase();
      return !query || haystack.includes(query);
    })
    .map((offense) => ({
      ...documentById(offense.documentId),
      id: `offense:${offense.id}`,
      documentId: offense.documentId,
      offense
    }))
    .slice(0, 250);
}

function scoreDocs(docs, query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const phrase = query.toLowerCase();
  return docs
    .map((doc) => {
      const text = `${doc.title} ${doc.category} ${doc.status} ${doc.summary} ${doc.text}`.toLowerCase();
      let score = 0;
      const title = doc.title.toLowerCase();
      if (title === phrase) score += 1000;
      else if (title.includes(phrase)) score += 250;
      if (text.includes(phrase)) score += 50;
      score += terms.reduce((sum, term) => {
        if (doc.title.toLowerCase().includes(term)) return sum + 8;
        if (doc.tags.join(" ").includes(term)) return sum + 5;
        return sum + (text.includes(term) ? 1 : 0);
      }, 0);
      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))
    .map((item) => item.doc);
}

function resultButton(doc) {
  if (state.view === "training") return trainingModuleButton(doc);
  if (state.view === "templates") return templateModuleButton(doc);
  const selected = doc.id === state.selectedId ? " is-selected" : "";
  const offenseLine = doc.offense ? `<span class="chip">${escapeHtml(doc.offense.offenseType || "Offense")}</span><span>${escapeHtml(doc.offense.penalty || "Penalty review needed")}</span>` : "";
  return `
    <button class="result${selected}" data-id="${escapeHtml(doc.id)}">
      <span class="result-title">${highlight(doc.offense?.name ?? doc.title)}</span>
      <span class="result-meta">
        <span class="chip ${doc.type}">${escapeHtml(doc.type)}</span>
        <span>${escapeHtml(doc.category || doc.metadata?.court || "")}</span>
        <span>${escapeHtml(doc.status || "")}</span>
        ${offenseLine}
      </span>
      <span>${highlight(doc.offense?.elements || doc.summary || doc.excerpt || "")}</span>
    </button>
  `;
}

function trainingModuleButton(module) {
  const selected = module.id === state.selectedId ? " is-selected" : "";
  return `
    <button class="result training-module-button${selected}" data-id="${escapeHtml(module.id)}">
      <span class="result-meta"><span class="chip library">${escapeHtml(module.level)}</span></span>
      <span class="result-title">${escapeHtml(module.title)}</span>
      <span>${escapeHtml(module.summary)}</span>
    </button>
  `;
}

function templateModuleButton(module) {
  const selected = module.id === state.selectedId ? " is-selected" : "";
  return `
    <button class="result training-module-button${selected}" data-id="${escapeHtml(module.id)}">
      <span class="result-meta"><span class="chip library">${escapeHtml(module.level)}</span></span>
      <span class="result-title">${escapeHtml(module.title)}</span>
      <span>${escapeHtml(module.summary)}</span>
    </button>
  `;
}

function renderDetail(results) {
  const selected = results.find((doc) => doc.id === state.selectedId) ?? state.index.documents.find((doc) => doc.id === state.selectedId);
  if (state.view === "training") {
    els.detail.innerHTML = trainingModuleDetail(selected || TRAINING_MODULES[0]);
    return;
  }
  if (state.view === "templates") {
    els.detail.innerHTML = templateModuleDetail(selected || TEMPLATE_MODULES[0]);
    bindCopyButtons();
    return;
  }
  if (!selected) {
    els.detail.innerHTML = state.view === "training" ? trainingModuleDetail(TRAINING_MODULES[0]) : `<div class="empty-detail">Select a record to inspect source text, notes, citations, and related materials.</div>`;
    return;
  }

  if (state.view === "offenses" && selected.offense) {
    els.detail.innerHTML = offenseDetail(selected, selected.offense);
    return;
  }

  const linked = relatedDocs(selected);
  const docSections = state.index.sections.filter((section) => section.documentId === selected.id);
  const docOffenses = state.index.offenses.filter((offense) => offense.documentId === selected.id);
  const docPosts = state.index.posts.filter((post) => post.documentId === selected.id);
  const relatedCases = selected.type === "law" ? linked.filter((doc) => doc.type === "case") : [];

  els.detail.innerHTML = `
    <h1 class="detail-title">${escapeHtml(selected.title)}</h1>
    <div class="detail-meta">
      <span class="chip ${selected.type}">${escapeHtml(selected.type)}</span>
      <span>${escapeHtml(selected.category)}</span>
      <span>${escapeHtml(selected.status)}</span>
      ${selected.metadata?.court ? `<span>${escapeHtml(selected.metadata.court)}</span>` : ""}
      ${selected.metadata?.caseNumber ? `<span>${escapeHtml(selected.metadata.caseNumber)}</span>` : ""}
    </div>
    <div class="detail-actions">
      <button class="copy-button" data-copy="${escapeAttr(selected.citation)}">Copy citation</button>
      <a class="source-link" href="${escapeAttr(selected.url)}" target="_blank" rel="noreferrer">Forum source</a>
    </div>
    ${state.editingId === selected.id ? editorBlock(selected) : ""}
    ${lawyerNotesBlock(selected)}
    ${selected.type === "law" ? aiLawBlock(selected) : ""}
    ${selected.type === "case" ? aiCaseBlock(selected) : ""}
    ${importantPrecedentBlock(selected)}
    ${selected.type === "law" ? lawSourceAidsBlock(selected, docSections) : ""}
    ${selected.type === "case" ? caseSourceAidsBlock(selected) : ""}
    ${metadataBlock(selected)}
    ${docOffenses.length ? offensesTable(docOffenses) : ""}
    ${docSections.length ? sectionsList(docSections) : ""}
    ${relatedCases.length ? relatedCasesList(relatedCases) : ""}
    ${linked.length ? relatedList(linked) : ""}
    ${docPosts.length ? postsList(docPosts) : ""}
    <div class="section">
      <h2>Source Text</h2>
      <div class="text-block text-block-full">${highlight(selected.text)}</div>
    </div>
  `;
  bindCopyButtons();
  bindEditor(selected);
}

function trainingModuleDetail(module) {
  return `
    <article class="training-guide">
      <div class="training-hero">
        <span class="chip library">${escapeHtml(module.level)}</span>
        <h1>${escapeHtml(module.title)}</h1>
        <p>${escapeHtml(module.summary)}</p>
      </div>
      ${module.sections.map((section) => `
        <div class="training-card">
          <h2>${escapeHtml(section.title)}</h2>
          ${listHtml(section.items)}
        </div>
      `).join("")}
      <div class="training-card training-drills">
        <h2>Practice Work</h2>
        ${listHtml(module.drills)}
      </div>
      <div class="training-card">
        <h2>How Active Lawyers Should Use This</h2>
        <p>Open the database in another tab when you need primary text, but use this module as your workflow checklist while drafting, arguing, or reviewing a case. The goal is not memorization; it is avoiding the recurring mistakes the court has already punished.</p>
      </div>
    </article>
  `;
}

function templateModuleDetail(module) {
  const templateText = module.template.join("\n");
  return `
    <article class="training-guide template-guide">
      <div class="training-hero">
        <span class="chip library">${escapeHtml(module.level)}</span>
        <h1>${escapeHtml(module.title)}</h1>
        <p>${escapeHtml(module.summary)}</p>
      </div>
      <div class="training-card">
        <h2>Source</h2>
        <p>${escapeHtml(module.source)}</p>
      </div>
      <div class="training-card">
        <h2>When To Use</h2>
        ${listHtml(module.whenToUse)}
      </div>
      <div class="training-card">
        <div class="section-heading-row">
          <h2>Template</h2>
          <button class="copy-button" data-copy="${escapeAttr(templateText)}">Copy template</button>
        </div>
        <pre class="template-block">${escapeHtml(templateText)}</pre>
      </div>
      <div class="training-card training-drills">
        <h2>Filing Checklist</h2>
        ${listHtml(module.checklist)}
      </div>
    </article>
  `;
}

function editorBlock(doc) {
  const notes = doc.metadata?.lawyerNotes ?? {};
  return `
    <form class="editor-panel" id="guideEditor">
      <div class="editor-head">
        <h2>Edit Lawyer Notes</h2>
        <span>Bar-reviewed notes. Saved separately from scraped source text and AI draft fields.</span>
      </div>
      ${doc.type === "law" ? `
        <label>Lawyer Summary<textarea data-field="metadata.lawyerNotes.summary" rows="5">${escapeHtml(notes.summary || "")}</textarea></label>
        <label>Purpose / Scope<textarea data-field="metadata.lawyerNotes.purpose" rows="4">${escapeHtml(notes.purpose || "")}</textarea></label>
        <label>Lawyer Practice Notes<textarea data-field="metadata.lawyerNotes.practiceNotes" data-array="true" rows="5">${escapeHtml((notes.practiceNotes || []).join("\n"))}</textarea></label>
        <label>Known Case Connections<textarea data-field="metadata.lawyerNotes.caseConnections" data-array="true" rows="5">${escapeHtml((notes.caseConnections || []).join("\n"))}</textarea></label>
        <label>Bar Exam / Training Notes<textarea data-field="metadata.lawyerNotes.trainingNotes" data-array="true" rows="5">${escapeHtml((notes.trainingNotes || []).join("\n"))}</textarea></label>
      ` : ""}
      ${doc.type === "case" ? `
        <label>Lawyer Summary<textarea data-field="metadata.lawyerNotes.summary" rows="5">${escapeHtml(notes.summary || "")}</textarea></label>
        <label>Case Brief<textarea data-field="metadata.lawyerNotes.caseBrief" rows="5">${escapeHtml(notes.caseBrief || "")}</textarea></label>
        <label>Holding / Order<textarea data-field="metadata.lawyerNotes.holding" rows="4">${escapeHtml(notes.holding || "")}</textarea></label>
        <label>Plaintiff / Appellant Theory<textarea data-field="metadata.lawyerNotes.plaintiffTheory" rows="4">${escapeHtml(notes.plaintiffTheory || "")}</textarea></label>
        <label>Defense / Appellee Theory<textarea data-field="metadata.lawyerNotes.defenseTheory" rows="4">${escapeHtml(notes.defenseTheory || "")}</textarea></label>
        <label>Precedent Value<textarea data-field="metadata.lawyerNotes.precedentValue" data-array="true" rows="5">${escapeHtml((notes.precedentValue || []).join("\n"))}</textarea></label>
        <label>Lawyer Practice Notes<textarea data-field="metadata.lawyerNotes.practiceNotes" data-array="true" rows="5">${escapeHtml((notes.practiceNotes || []).join("\n"))}</textarea></label>
      ` : ""}
      <div class="editor-actions">
        <button type="submit" class="save-button">Save Lawyer Notes</button>
        <button type="button" class="tool-button" data-cancel-edit>Cancel</button>
        <span id="saveStatus"></span>
      </div>
    </form>
  `;
}

function lawyerNotesBlock(doc) {
  const notes = doc.metadata?.lawyerNotes ?? {};
  const rows = [
    ["Lawyer Summary", notes.summary],
    ["Purpose / Scope", notes.purpose],
    ["Case Brief", notes.caseBrief],
    ["Holding / Order", notes.holding],
    ["Plaintiff / Appellant Theory", notes.plaintiffTheory],
    ["Defense / Appellee Theory", notes.defenseTheory]
  ].filter(([, value]) => value);
  const lists = [
    ["Practice Notes", notes.practiceNotes],
    ["Precedent Value", notes.precedentValue],
    ["Known Case Connections", notes.caseConnections],
    ["Training Notes", notes.trainingNotes]
  ].filter(([, value]) => Array.isArray(value) && value.length);
  return `
    <div class="section notice-section">
      <div class="section-heading-row">
        <h2>Lawyer Notes</h2>
        <button class="edit-button" data-edit="${escapeAttr(doc.id)}">${state.editingId === doc.id ? "Close" : "Edit"}</button>
      </div>
      ${!rows.length && !lists.length ? `<p>No bar-reviewed notes have been added yet.</p>` : ""}
      ${rows.length ? `
      <table class="table"><tbody>
        ${rows.map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${highlight(value)}</td></tr>`).join("")}
      </tbody></table>` : ""}
      ${lists.map(([key, value]) => `<div class="subsection"><strong>${escapeHtml(key)}</strong>${listHtml(value)}</div>`).join("")}
    </div>
  `;
}

function aiLawBlock(doc) {
  const guide = doc.metadata?.aiGuide;
  if (!guide) return "";
  return `
     `;
}

function aiCaseBlock(doc) {
  const summary = doc.metadata?.aiCase;
  if (!summary) return "";
  return `
    <div class="section ai-section">
      <h2>AI Case Brief</h2>
      <p class="muted-line">${escapeHtml(summary.extractionWarning || "Draft extraction. Verify against captured posts before citation.")}</p>
      <table class="table"><tbody>
        <tr><th>Plaintiff / Appellant</th><td>${highlight(summary.plaintiffPosition || "Review docket.")}</td></tr>
        <tr><th>Defense / Appellee</th><td>${highlight(summary.defendantPosition || "Review docket.")}</td></tr>
        <tr><th>Legal Issues</th><td>${listHtml(summary.legalIssues)}</td></tr>
        <tr><th>Requested Relief</th><td>${highlight(summary.requestedRelief || "No requested relief was isolated.")}</td></tr>
        <tr><th>Decision / Posture</th><td>${highlight(summary.finalDecision || "No final decision was isolated.")}${summary.finalDecisionPostUrl ? `<br><a href="${escapeAttr(summary.finalDecisionPostUrl)}" target="_blank" rel="noreferrer">Decision post</a>` : ""}</td></tr>
        <tr><th>Lawyer Relevance</th><td>${listHtml(summary.relevance)}</td></tr>
      </tbody></table>
      ${summary.proceduralHistory?.length ? `<div class="subsection"><strong>Procedural History</strong>${listHtml(summary.proceduralHistory)}</div>` : ""}
    </div>
  `;
}

function importantPrecedentBlock(doc) {
  const precedent = doc.metadata?.importantPrecedent;
  if (!precedent) return "";
  return `
    <div class="section precedent-section">
      <h2>Important Precedent</h2>
      <p class="muted-line">${escapeHtml(precedent.note || "Precedent candidate. Verify before citation.")}</p>
      ${listHtml(precedent.rules)}
      ${precedent.sourcePostUrl ? `<p><a href="${escapeAttr(precedent.sourcePostUrl)}" target="_blank" rel="noreferrer">Source decision</a></p>` : ""}
    </div>
  `;
}

function lawSourceAidsBlock(doc, sections) {
  const definitions = doc.metadata?.definitions ?? [];
  return `
      `;
}

function caseSourceAidsBlock(doc) {
  const signals = doc.metadata?.proceduralSignals ?? [];
  if (!signals.length) return "";
  return `
    <div class="section">
      <h2>Docket Signals</h2>
      <p>Mechanical timeline markers only. Use the captured posts and human notes for actual case briefs.</p>
      ${listHtml(signals)}
    </div>
  `;
}

function offenseDetail(doc, offense) {
  const sourceDoc = documentById(offense.documentId) ?? doc;
  const sourceSections = state.index.sections.filter((section) => section.documentId === offense.documentId);
  const matchingSection = sourceSections.find((section) => section.heading === offense.sectionHeading);
  return `
    <h1 class="detail-title">${escapeHtml(offense.name)}</h1>
    <div class="detail-meta">
      <span class="chip law">offense</span>
      <span>${escapeHtml(offense.offenseType || "Unclassified")}</span>
      <span>${escapeHtml(offense.lawTitle)}</span>
    </div>
    <div class="detail-actions">
      <button class="copy-button" data-copy="${escapeAttr(offense.citation || `${offense.name}, ${offense.lawTitle}`)}">Copy citation</button>
      <a class="source-link" href="${escapeAttr(doc.url)}" target="_blank" rel="noreferrer">Forum source</a>
    </div>
    <div class="section"><h2>Penalty</h2><p>${highlight(offense.penalty || "Review full law text.")}</p></div>
    <div class="section"><h2>Elements</h2><p>${highlight(offense.elements || "Review full law text.")}</p></div>
    <div class="section"><h2>Citation</h2><p>${escapeHtml(offense.citation || sourceDoc.citation || sourceDoc.title)}</p></div>
    <div class="section"><h2>Source Law</h2><p>${escapeHtml(sourceDoc.title)}${offense.sectionNumber ? ` § ${escapeHtml(offense.sectionNumber)}${offense.subsection ? `(${escapeHtml(offense.subsection)})` : ""}` : ""}${offense.sectionHeading ? `, ${escapeHtml(offense.sectionHeading)}` : ""}</p></div>
    ${matchingSection ? `<div class="section"><h2>Source Section</h2><div class="text-block">${highlight(matchingSection.body)}</div></div>` : ""}
  `;
}

function metadataBlock(doc) {
  const meta = doc.metadata ?? {};
  const rows = [
    ["Citation", doc.citation],
    ["Ratified", meta.ratified],
    ["Final vote", meta.finalVote],
    ["Original bill", meta.originalBillUrl],
    ["Plaintiff", meta.plaintiff],
    ["Defendant", meta.defendant],
    ["Images", meta.imagesCaptured ? String(meta.imagesCaptured) : ""]
  ].filter(([, value]) => value);
  if (!rows.length) return "";
  return `
    <div class="section">
      <h2>Reference Data</h2>
      <table class="table"><tbody>
        ${rows.map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${key === "Original bill" ? `<a href="${escapeAttr(value)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>` : escapeHtml(value)}</td></tr>`).join("")}
      </tbody></table>
    </div>
  `;
}

function offensesTable(offenses) {
  return `
    <div class="section">
      <h2>Extracted Offenses</h2>
      <table class="table">
        <thead><tr><th>Offense</th><th>Citation</th><th>Type</th><th>Penalty</th></tr></thead>
        <tbody>${offenses.map((offense) => `<tr><td>${escapeHtml(offense.name)}</td><td>${escapeHtml(offense.citation || "")}</td><td>${escapeHtml(offense.offenseType)}</td><td>${escapeHtml(offense.penalty)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function sectionsList(sections) {
  return `
    <div class="section">
      <h2>Sections</h2>
      <div class="mini-list">${sections.map((section) => `<details class="mini-item"><summary>${escapeHtml(section.number)}. ${escapeHtml(section.heading)}</summary><p>${highlight(section.body)}</p></details>`).join("")}</div>
    </div>
  `;
}

function relatedCasesList(docs) {
  return `
    <div class="section">
      <h2>Referenced In Cases (${docs.length})</h2>
      <div class="mini-list">${docs.map((doc) => `<button class="result" data-id="${escapeHtml(doc.id)}"><span class="result-title">${escapeHtml(doc.title)}</span><span class="result-meta"><span class="chip case">case</span><span>${escapeHtml(doc.metadata?.court || "")}</span><span>${escapeHtml(doc.status || "")}</span></span><span>${escapeHtml(doc.summary || doc.excerpt || "")}</span></button>`).join("")}</div>
    </div>
  `;
}

function relatedList(docs) {
  const filtered = docs.filter((doc) => doc.type !== "case");
  if (!filtered.length) return "";
  return `
    <div class="section">
      <h2>Related Materials</h2>
      <div class="mini-list">${filtered.map((doc) => `<button class="result" data-id="${escapeHtml(doc.id)}"><span class="result-title">${escapeHtml(doc.title)}</span><span class="result-meta"><span class="chip ${doc.type}">${escapeHtml(doc.type)}</span><span>${escapeHtml(doc.category)}</span></span></button>`).join("")}</div>
    </div>
  `;
}

function postsList(posts) {
  return `
    <div class="section">
      <h2>All Captured Posts (${posts.length})</h2>
      <div class="mini-list">${posts.map((post, index) => `<details class="mini-item" ${index === 0 ? "open" : ""}><summary>${escapeHtml(post.author || "Unknown")} <span>${escapeHtml(post.date || "")}</span></summary><div class="result-meta">${post.postUrl ? `<a href="${escapeAttr(post.postUrl)}" target="_blank" rel="noreferrer">Source post</a>` : ""}${post.images?.length ? `<span>${post.images.length} image${post.images.length === 1 ? "" : "s"}</span>` : ""}</div><div class="post-body">${highlight(post.body)}</div>${post.images?.length ? `<div class="chips">${post.images.map((image) => `<a class="chip" href="${escapeAttr(image.src)}" target="_blank" rel="noreferrer">Image</a>`).join("")}</div>` : ""}</details>`).join("")}</div>
    </div>
  `;
}

function bindCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const originalLabel = button.dataset.copyLabel || button.textContent;
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copied";
      setTimeout(() => (button.textContent = originalLabel), 900);
    });
  });
  document.querySelectorAll(".detail-panel .result[data-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id;
      state.view = "all";
      render();
    });
  });
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingId = state.editingId === button.dataset.edit ? null : button.dataset.edit;
      render();
    });
  });
}

function bindEditor(doc) {
  const form = document.querySelector("#guideEditor");
  if (!form) return;
  form.querySelector("[data-cancel-edit]")?.addEventListener("click", () => {
    state.editingId = null;
    render();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = form.querySelector("#saveStatus");
    status.textContent = "Saving...";
    const patch = patchFromForm(form);
    const response = await fetch("/api/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: doc.id, patch })
    });
    if (!response.ok) {
      status.textContent = "Save failed.";
      return;
    }
    state.overrides = await response.json();
    const target = documentById(doc.id);
    deepMerge(target, patch);
    state.editingId = null;
    render();
  });
}

function patchFromForm(form) {
  const patch = {};
  form.querySelectorAll("[data-field]").forEach((input) => {
    const value = input.dataset.array === "true"
      ? input.value.split("\n").map((line) => line.trim()).filter(Boolean)
      : input.value.trim();
    setPath(patch, input.dataset.field, value);
  });
  return patch;
}

function setPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor[part] = cursor[part] ?? {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

function applyOverrides() {
  for (const [documentId, patch] of Object.entries(state.overrides.documents ?? {})) {
    const doc = state.index.documents.find((candidate) => candidate.id === documentId);
    if (doc) deepMerge(doc, patch);
  }
}

function deepMerge(target, patch) {
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function relatedDocs(doc) {
  const outgoing = state.index.links.filter((link) => link.from === doc.id).map((link) => documentById(link.to));
  const incoming = state.index.links.filter((link) => link.to === doc.id).map((link) => documentById(link.from));
  return [...new Map([...outgoing, ...incoming].filter(Boolean).map((item) => [item.id, item])).values()];
}

function listHtml(items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return "<span>Review source text.</span>";
  return `<ul>${list.map((item) => `<li>${highlight(typeof item === "string" ? item : JSON.stringify(item))}</li>`).join("")}</ul>`;
}

function documentById(id) {
  return state.index.documents.find((doc) => doc.id === id);
}

function titleCase(value) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function highlight(value) {
  const text = escapeHtml(String(value ?? ""));
  if (!state.query) return text;
  const terms = state.query.split(/\s+/).filter((term) => term.length > 2).map(escapeRegExp);
  if (!terms.length) return text;
  return text.replace(new RegExp(`(${terms.join("|")})`, "gi"), "<mark>$1</mark>");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
