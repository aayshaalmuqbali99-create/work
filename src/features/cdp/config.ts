/**
 * CDP Programme Evaluation 2026 — editable definitions.
 *
 * Everything the results platform needs to know about the questionnaire lives here:
 *  - which questions exist, which tab they belong to and in what order;
 *  - how a column header in the Excel file is recognised (`match` phrases, English and Arabic);
 *  - the Excel column letter of the current file (used only to VERIFY the mapping, and as a
 *    last-resort fallback that is clearly flagged in the upload report);
 *  - comment themes and their keywords;
 *  - the privacy threshold for small departments;
 *  - the reference counts of the file "(1-137)" that every import is checked against.
 *
 * Interface texts (titles, buttons, explanations) are in src/messages/{ar,en}.json under "Cdp".
 * The question text SHOWN to users is the header exactly as it appears in the uploaded file;
 * `ar`/`en` below are only used when a column is missing from the file.
 */

export type TabId = "general" | "cdpt" | "ojt" | "huawei";
export type QuestionKind =
  | "satisfaction" // overall satisfaction (shown first and as a headline card)
  | "rating" // yes / partly / no where "yes" is positive
  | "challenge" // yes / partly / no where "yes" means the participant FACED a challenge
  | "text" // open answer (themes + comments)
  | "names" // thanks: names of people who helped (restricted)
  | "thanks"; // thanks: free-text contributions / messages

export type QuestionDef = {
  id: string; // = Excel column letter in the reference file
  tab: TabId;
  kind: QuestionKind;
  ar: string;
  en: string;
  /** Phrases that identify the header. Each phrase is matched by its significant words. */
  match: string[];
  /** Words that must NOT appear in the header (separates CDP vs CDP-T vs OJT vs Huawei). */
  exclude?: string[];
  /** Thanks sub-section at the bottom of the Huawei tab. */
  thanks?: boolean;
};

export const TABS: { id: TabId; ar: string; en: string }[] = [
  { id: "general", ar: "التقييم العام لبرنامج CDP", en: "CDP Programme — Overall" },
  { id: "cdpt", ar: "الدورات الإلكترونية CDP‑T", en: "E-learning courses CDP‑T" },
  { id: "ojt", ar: "التدريب أثناء العمل CDP‑OJT", en: "On-the-job training CDP‑OJT" },
  { id: "huawei", ar: "تقييم فريق Huawei OMS", en: "Huawei OMS team" },
];

const SPECIFIC = ["cdp-t", "cdpt", "ojt", "on-the-job", "huawei", "oms", "هواوي", "الدورات", "courses", "الالكترونيه"];

export const QUESTIONS: QuestionDef[] = [
  // ── Tab 1: overall CDP ─────────────────────────────────────────────────────────────
  { id: "AQ", tab: "general", kind: "satisfaction", ar: "بشكل عام، هل أنتم راضون عن برنامج التطوير الوظيفي؟", en: "Overall, are you satisfied with the Career Development Programme?",
    match: ["overall satisfied career development programme", "overall satisfied cdp", "بشكل عام راضون برنامج التطوير الوظيفي"], exclude: SPECIFIC },
  { id: "F", tab: "general", kind: "rating", ar: "هل كانت أهداف برنامج التطوير الوظيفي واضحة لكم؟", en: "Were the objectives of the CDP clear to you?",
    match: ["objectives cdp clear", "objectives career development programme clear", "goals programme clear", "اهداف برنامج التطوير الوظيفي واضحه"] },
  { id: "G", tab: "general", kind: "rating", ar: "هل نُفّذ برنامج التطوير الوظيفي بطريقة واضحة ومنظمة؟", en: "Was the CDP implemented in a clear and organised way?",
    match: ["implemented clear organized", "implemented clear organised", "delivered clear organized", "نفذ برنامج التطوير الوظيفي بطريقه واضحه ومنظمه"] },
  { id: "H", tab: "general", kind: "rating", ar: "هل كان برنامج التطوير الوظيفي ذا صلة بعملكم؟", en: "Was the CDP relevant to your work?",
    match: ["cdp relevant work", "career development programme relevant work", "programme relevant job", "برنامج التطوير الوظيفي ذا صله بعملكم"], exclude: ["courses", "content", "ojt", "topics", "الدورات", "محتوى", "موضوعات"] },
  { id: "I", tab: "general", kind: "rating", ar: "هل ساهم برنامج التطوير الوظيفي في تطويركم المهني؟", en: "Did the CDP contribute to your professional development?",
    match: ["contribute professional development", "cdp professional development", "ساهم برنامج التطوير الوظيفي تطويركم المهني"] },
  { id: "AT", tab: "general", kind: "text", ar: "ما توصياتكم لتحسين برنامج التطوير الوظيفي؟", en: "What are your recommendations to improve the CDP?",
    match: ["recommendations improve", "recommendation improve cdp", "توصياتكم لتحسين برنامج التطوير الوظيفي"] },

  // ── Tab 2: CDP-T e-learning ────────────────────────────────────────────────────────
  { id: "AR", tab: "cdpt", kind: "satisfaction", ar: "بشكل عام، هل أنتم راضون عن CDP‑T؟", en: "Overall, are you satisfied with CDP‑T?",
    match: ["overall satisfied cdp-t", "overall satisfied cdpt", "overall satisfied courses", "بشكل عام راضون cdp-t"], exclude: ["ojt", "on-the-job", "huawei", "هواوي", "اثناء"] },
  { id: "J", tab: "cdpt", kind: "rating", ar: "هل كانت المعلومات في AGIOPS أو ملف Excel الذي تمت مشاركته معكم واضحة؟", en: "Was the information in AGIOPS or the shared Excel file clear?",
    match: ["information agiops excel clear", "agiops excel file shared clear", "المعلومات agiops excel واضحه"] },
  { id: "K", tab: "cdpt", kind: "rating", ar: "هل كانت الدورات متاحة ويمكن الوصول إليها عند الحاجة؟", en: "Were the courses available and accessible when needed?",
    match: ["courses available accessible", "courses accessible needed", "الدورات متاحه الوصول اليها"] },
  { id: "L", tab: "cdpt", kind: "rating", ar: "هل كان محتوى الدورات واضحًا وسهل الفهم؟", en: "Was the course content clear and easy to understand?",
    match: ["course content clear easy understand", "content clear easy understand", "محتوى الدورات واضحا وسهل الفهم"] },
  { id: "M", tab: "cdpt", kind: "rating", ar: "هل كان محتوى الدورات ذا صلة بعملكم؟", en: "Was the course content relevant to your work?",
    match: ["course content relevant work", "courses relevant work", "محتوى الدورات ذا صله بعملكم"] },
  { id: "N", tab: "cdpt", kind: "rating", ar: "هل ساعدتكم الدورات على اكتساب معارف ومهارات جديدة؟", en: "Did the courses help you gain new knowledge and skills?",
    match: ["courses help gain new knowledge skills", "gain new knowledge skills", "ساعدتكم الدورات اكتساب معارف ومهارات جديده"] },
  { id: "O", tab: "cdpt", kind: "rating", ar: "هل تمكنتم من تطبيق ما تعلمتموه في عملكم؟", en: "Were you able to apply what you learned in your work?",
    match: ["able apply learned work", "apply what learned work", "تمكنتم تطبيق تعلمتموه عملكم"], exclude: ["opportunities", "practical", "فرص", "عمليه"] },
  { id: "P", tab: "cdpt", kind: "rating", ar: "هل ساهمت الدورات في تحسين أدائكم في العمل؟", en: "Did the courses improve your performance at work?",
    match: ["courses improve performance work", "improve performance", "ساهمت الدورات تحسين ادائكم"] },
  { id: "Q", tab: "cdpt", kind: "challenge", ar: "هل واجهتم أي تحديات في الدورات الإلكترونية؟", en: "Did you face any challenges with the e-learning courses?",
    match: ["challenges e-learning courses", "challenges online courses", "challenges courses", "واجهتم تحديات الدورات الالكترونيه"], exclude: ["ojt", "on-the-job", "huawei", "هواوي", "اثناء"] },

  // ── Tab 3: OJT ─────────────────────────────────────────────────────────────────────
  { id: "AS", tab: "ojt", kind: "satisfaction", ar: "بشكل عام، هل أنتم راضون عن التدريب أثناء العمل؟", en: "Overall, are you satisfied with the on-the-job training?",
    match: ["overall satisfied on-the-job training", "overall satisfied ojt", "بشكل عام راضون التدريب اثناء العمل"], exclude: ["huawei", "هواوي"] },
  { id: "R", tab: "ojt", kind: "rating", ar: "هل تلقيتم إرشادات واضحة حول استخدام AGIOPS؟", en: "Did you receive clear guidance on using AGIOPS?",
    match: ["clear guidance using agiops", "guidance agiops", "تلقيتم ارشادات واضحه استخدام agiops"], exclude: ["support", "دعما"] },
  { id: "S", tab: "ojt", kind: "rating", ar: "هل تلقيتم إرشادات واضحة حول تحديث تقدمكم؟", en: "Did you receive clear guidance on updating your progress?",
    match: ["clear guidance updating progress", "guidance update progress", "تلقيتم ارشادات واضحه تحديث تقدمكم"] },
  { id: "T", tab: "ojt", kind: "rating", ar: "هل تم شرح موضوعات التدريب أثناء العمل بوضوح؟", en: "Were the OJT topics explained clearly?",
    match: ["ojt topics explained clearly", "topics explained clearly", "شرح موضوعات التدريب اثناء العمل بوضوح"] },
  { id: "U", tab: "ojt", kind: "rating", ar: "هل كانت موضوعات التدريب أثناء العمل ذات صلة بعملكم؟", en: "Were the OJT topics relevant to your work?",
    match: ["ojt topics relevant work", "topics relevant work", "موضوعات التدريب اثناء العمل ذات صله بعملكم"] },
  { id: "V", tab: "ojt", kind: "rating", ar: "هل تم تقديم التدريب أثناء العمل المخطط له فعليًا؟", en: "Was the planned OJT actually delivered?",
    match: ["planned ojt actually delivered", "planned training delivered", "تقديم التدريب اثناء العمل المخطط فعليا"] },
  { id: "W", tab: "ojt", kind: "rating", ar: "هل كانت الشروحات أثناء التدريب واضحة وفعّالة؟", en: "Were the explanations during training clear and effective?",
    match: ["explanations training clear effective", "explanations clear effective", "الشروحات اثناء التدريب واضحه وفعاله"] },
  { id: "X", tab: "ojt", kind: "rating", ar: "هل أُتيحت لكم فرص عملية لتطبيق ما تعلمتموه؟", en: "Were you given practical opportunities to apply what you learned?",
    match: ["practical opportunities apply learned", "hands-on opportunities apply", "اتيحت فرص عمليه لتطبيق تعلمتموه"] },
  { id: "Y", tab: "ojt", kind: "rating", ar: "هل كان تقدمكم التدريبي المسجل دقيقًا؟", en: "Was your recorded training progress accurate?",
    match: ["recorded training progress accurate", "progress accurate", "تقدمكم التدريبي المسجل دقيقا"] },
  { id: "Z", tab: "ojt", kind: "rating", ar: "هل ساعدكم التدريب أثناء العمل على تطوير مهاراتكم؟", en: "Did the OJT help you develop your skills?",
    match: ["ojt help develop skills", "training help develop skills", "ساعدكم التدريب اثناء العمل تطوير مهاراتكم"] },
  { id: "AA", tab: "ojt", kind: "rating", ar: "هل ساعدكم التدريب أثناء العمل على أداء مهامكم باستقلالية أكبر؟", en: "Did the OJT help you perform your tasks more independently?",
    match: ["perform tasks more independently", "tasks independently", "اداء مهامكم باستقلاليه اكبر"] },
  { id: "AB", tab: "ojt", kind: "challenge", ar: "هل واجهتم أي تحديات أثناء التدريب أثناء العمل؟", en: "Did you face any challenges during the OJT?",
    match: ["challenges during ojt", "challenges on-the-job training", "واجهتم تحديات اثناء التدريب اثناء العمل"], exclude: ["huawei", "هواوي", "courses", "الدورات"] },

  // ── Tab 4: Huawei OMS ─────────────────────────────────────────────────────────────
  { id: "AO", tab: "huawei", kind: "satisfaction", ar: "بشكل عام، هل كنتم راضين عن الدعم المقدم من فريق Huawei OMS؟", en: "Overall, were you satisfied with the support provided by the Huawei OMS team?",
    match: ["overall satisfied support huawei oms", "overall satisfied huawei", "بشكل عام راضين الدعم المقدم فريق huawei"] },
  { id: "AC", tab: "huawei", kind: "rating", ar: "هل تعاون فريق Huawei OMS معكم بفاعلية؟", en: "Did the Huawei OMS team cooperate with you effectively?",
    match: ["huawei oms team cooperate effectively", "cooperate effectively", "تعاون فريق huawei بفاعليه"] },
  { id: "AD", tab: "huawei", kind: "rating", ar: "هل بادر الفريق إلى نقل المعرفة إليكم؟", en: "Did the team proactively transfer knowledge to you?",
    match: ["proactively transfer knowledge", "knowledge transfer", "بادر الفريق نقل المعرفه"] },
  { id: "AE", tab: "huawei", kind: "rating", ar: "هل كانت المواد التدريبية مفيدة وملائمة؟", en: "Were the training materials useful and appropriate?",
    match: ["training materials useful appropriate", "materials useful", "المواد التدريبيه مفيده وملائمه"] },
  { id: "AF", tab: "huawei", kind: "rating", ar: "هل تلقيتم دعمًا كافيًا من فريق Huawei OMS بشأن CDP‑T؟", en: "Did you receive sufficient support from the Huawei OMS team on CDP‑T?",
    match: ["sufficient support huawei cdp-t", "adequate support cdp-t", "دعما كافيا huawei cdp-t"] },
  { id: "AG", tab: "huawei", kind: "rating", ar: "هل تلقيتم دعمًا كافيًا من فريق Huawei OMS بشأن AGIOPS؟", en: "Did you receive sufficient support from the Huawei OMS team on AGIOPS?",
    match: ["sufficient support huawei agiops", "adequate support agiops", "دعما كافيا huawei agiops"] },
  { id: "AH", tab: "huawei", kind: "rating", ar: "هل استجاب الفريق لأسئلتكم وطلباتكم في الوقت المناسب؟", en: "Did the team respond to your questions and requests in a timely manner?",
    match: ["respond questions requests timely", "timely manner", "استجاب الفريق لاسئلتكم وطلباتكم الوقت المناسب"] },
  { id: "AI", tab: "huawei", kind: "rating", ar: "هل تابع الفريق تقدمكم التدريبي بفاعلية؟", en: "Did the team follow up on your training progress effectively?",
    match: ["follow up training progress effectively", "followed up progress", "تابع الفريق تقدمكم التدريبي بفاعليه"] },
  { id: "AJ", tab: "huawei", kind: "rating", ar: "هل أظهر الفريق سلوكًا مهنيًا طوال البرنامج؟", en: "Did the team behave professionally throughout the programme?",
    match: ["behave professionally throughout", "professional behaviour throughout", "professional behavior throughout programme", "team professional", "اظهر الفريق سلوكا مهنيا"] },
  { id: "AK", tab: "huawei", kind: "rating", ar: "هل شعرتم بحرية طرح الأسئلة على الفريق؟", en: "Did you feel free to ask the team questions?",
    match: ["feel free ask questions", "comfortable asking questions", "شعرتم بحريه طرح الاسئله"] },
  { id: "AL", tab: "huawei", kind: "rating", ar: "هل رحّب الفريق بآرائكم وتقبّل ملاحظاتكم؟", en: "Did the team welcome your opinions and accept your feedback?",
    match: ["welcome opinions accept feedback", "welcomed feedback", "رحب الفريق بارائكم وتقبل ملاحظاتكم"] },
  { id: "AM", tab: "huawei", kind: "rating", ar: "هل مكّنكم الفريق من تولّي مسؤولية تطويركم؟", en: "Did the team empower you to take ownership of your development?",
    match: ["take ownership development", "empower ownership", "مكنكم الفريق تولي مسؤوليه تطويركم"] },
  { id: "AN", tab: "huawei", kind: "challenge", ar: "هل واجهتم أي تحديات أثناء العمل مع فريق Huawei OMS؟", en: "Did you face any challenges while working with the Huawei OMS team?",
    match: ["challenges working huawei oms", "challenges huawei", "واجهتم تحديات العمل فريق huawei"] },
  { id: "AP", tab: "huawei", kind: "text", ar: "يرجى ذكر أي طلبات تدريبية لم تتم تلبيتها و/أو اقتراحات لتحسين دعم فريق Huawei OMS.", en: "Please mention any unmet training requests and/or suggestions to improve the Huawei OMS team's support.",
    match: ["unmet training requests suggestions", "training requests not met suggestions improve huawei", "طلبات تدريبيه لم تتم تلبيتها"] },

  // Thanks & recognition (bottom of the Huawei tab; covers Omantel and Huawei OMS staff)
  { id: "AU", tab: "huawei", kind: "names", thanks: true, ar: "أسماء الأشخاص الذين قدموا الدعم", en: "Names of the people who provided support",
    match: ["names people provided support", "names supported", "name person who supported", "اسماء الاشخاص الذين قدموا الدعم"] },
  { id: "AV", tab: "huawei", kind: "thanks", thanks: true, ar: "وصف المساهمات المتميزة", en: "Description of outstanding contributions",
    match: ["outstanding contributions", "describe contribution", "وصف المساهمات المتميزه"] },
  { id: "AW", tab: "huawei", kind: "thanks", thanks: true, ar: "رسائل الشكر والتقدير", en: "Messages of thanks and appreciation",
    match: ["message thanks appreciation", "thank you message", "رسائل الشكر والتقدير", "رساله شكر"] },
];

export const CLOSED_KINDS: QuestionKind[] = ["satisfaction", "rating", "challenge"];
export const CLOSED_QUESTIONS = QUESTIONS.filter((q) => CLOSED_KINDS.includes(q.kind));
export const SATISFACTION_QUESTIONS = QUESTIONS.filter((q) => q.kind === "satisfaction");

/** Department / operational area column. */
export const DEPARTMENT_MATCH = ["department", "operational area", "operational domain", "section", "division", "القسم", "المجال التشغيلي", "الدائره"];

/** Columns that identify the respondent. They are never stored. */
export const IDENTITY_MATCH = ["name", "email", "e-mail", "employee id", "employee number", "staff id", "staff number", "الاسم", "البريد", "الرقم الوظيفي"];
/** Columns of a Microsoft Forms export that are not questions; dropped on import. */
export const META_MATCH = ["id", "start time", "completion time", "last modified time"];

/** Answers. Checked in this order. */
export const ANSWER_SYNONYMS = {
  p: ["partially", "partly", "somewhat", "to some extent", "some extent", "to a certain extent", "الى حد ما", "نوعا ما", "جزئيا", "احيانا"],
  y: ["yes", "نعم"],
  n: ["no", "لا"],
};
/** Text answers that mean "no comment". They are not counted as comments. */
export const EMPTY_TEXT = ["-", "--", ".", "n/a", "na", "nil", "none", "no", "nothing", "no comment", "no comments", "لا", "لا يوجد", "لايوجد", "لا شيء", "لا شي", "لا توجد", "لا تعليق", "nothing to add"];

/** Departments with fewer responses than this are only shown inside the overall results to management users. */
export const MIN_GROUP_SIZE = 5;

/** Comment themes. A comment can match several themes. Keywords are matched on normalised text. */
export const THEMES: { id: string; ar: string; en: string; keywords: string[] }[] = [
  { id: "practical", ar: "التدريب العملي", en: "Hands-on practical training",
    keywords: ["practical", "hands-on", "hands on", "practice", "field", "site visit", "on site", "real equipment", "عملي", "عمليه", "ميداني", "تطبيقي", "تطبيق عملي", "الموقع", "زيارات"] },
  { id: "relevance", ar: "ملاءمة الدورات للوظيفة", en: "Course relevance to the job",
    keywords: ["relevant", "relevance", "related to my", "not related", "irrelevant", "my job", "my role", "my work", "job role", "ملاءم", "صله", "مرتبط", "علاقه", "طبيعه العمل", "مجال عمل", "الوظيفه", "تخصص"] },
  { id: "trainer", ar: "المدرّب المتخصص", en: "Specialised trainer",
    keywords: ["trainer", "instructor", "expert", "specialist", "coach", "mentor", "tutor", "مدرب", "مختص", "خبير", "محاضر", "متخصص"] },
  { id: "plan", ar: "وضوح الخطة", en: "Clarity of the plan",
    keywords: ["plan", "clear", "clarity", "schedule", "structure", "organized", "organised", "roadmap", "objective", "خطه", "واضح", "وضوح", "تنظيم", "جدول", "اهداف"] },
  { id: "time", ar: "الوقت المخصص للتدريب", en: "Time allocated to training",
    keywords: ["time", "busy", "workload", "work load", "hours", "duration", "dedicated", "deadline", "وقت", "الوقت", "ساعات", "ضغط العمل", "مده", "مخصص"] },
  { id: "platform", ar: "المنصة والوصول (AGIOPS)", en: "Platform & access (AGIOPS)",
    keywords: ["agiops", "access", "system", "platform", "login", "link", "portal", "منصه", "الدخول", "الوصول", "النظام", "رابط"] },
  { id: "support", ar: "الدعم والمتابعة", en: "Support & follow-up",
    keywords: ["support", "follow up", "follow-up", "response", "communication", "help", "دعم", "متابعه", "تواصل", "استجابه", "مساعده"] },
];

/**
 * Reference counts of "Copy of Omantel – CDP Programme Evaluation 2026(1-137).xlsx".
 * Every import is compared with these; differences are shown in the upload report (they are expected for newer files).
 */
export const REFERENCE = {
  fileLabel: "Omantel – CDP Programme Evaluation 2026 (1-137)",
  total: 137,
  departments: { "Network and Facilities Operations": 102, "Facility Operation": 19, Electrotechnical: 13, "Physical Security": 3 } as Record<string, number>,
  satisfaction: {
    AQ: { y: 34, p: 46, n: 57 },
    AR: { y: 38, p: 42, n: 57 },
    AS: { y: 38, p: 45, n: 54 },
    AO: { y: 49, p: 44, n: 44 },
  } as Record<string, { y: number; p: number; n: number }>,
};

export const SHEET_NAME = "Sheet1";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // server actions accept up to 9 MB (next.config.ts)
