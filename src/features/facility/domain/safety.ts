/**
 * Detects descriptions that may describe a dangerous situation. This only triggers a warning that
 * tells the employee to contact building security / emergency services through verified channels —
 * the online request is never presented as the emergency response.
 */
const PATTERNS: { key: SafetyKind; re: RegExp }[] = [
  { key: "smoke", re: /\b(smoke|smoking|burning smell|smell of burning|burnt smell|fire|flames?|sparks?)\b|دخان|حريق|رائحة احتراق|رائحة حريق|شرار|لهب|نار/i },
  { key: "wiring", re: /\b(exposed wir(e|es|ing)|live wire|bare wire|electric shock|electrocut\w*)\b|أسلاك مكشوفة|سلك مكشوف|صعقة|سلك عاري|أسلاك عارية/i },
  { key: "waterElectric", re: /((leak|water|flood)\w*.{0,40}(electric|socket|panel|wiring|cable)|(electric|socket|panel|wiring|cable)\w*.{0,40}(leak|water|flood))|(تسرب|مياه|ماء|فيضان).{0,30}(كهرب|مقبس|لوحة|أسلاك)|(كهرب|مقبس|لوحة|أسلاك).{0,30}(تسرب|مياه|ماء)/i },
  { key: "exit", re: /\b(blocked|locked|obstructed) (fire |emergency )?exits?\b|\b(emergency|fire) exit\w* (is |are )?(blocked|locked|obstructed)|مخرج طوارئ مغلق|مخرج الطوارئ مغلق|مخارج الطوارئ مغلقة|مخرج الطوارئ مسدود/i },
  { key: "entrapment", re: /\b(stuck|trapped) in (the |an )?(elevator|lift)|(elevator|lift) entrapment|محتجز في المصعد|عالق في المصعد|عالقين في المصعد|محاصر في المصعد/i },
  { key: "gas", re: /\bgas (leak|smell)\b|تسرب غاز|رائحة غاز/i },
];

export type SafetyKind = "smoke" | "wiring" | "waterElectric" | "exit" | "entrapment" | "gas";

export function detectSafetyRisks(text: string): SafetyKind[] {
  const t = (text ?? "").slice(0, 5000);
  return PATTERNS.filter((p) => p.re.test(t)).map((p) => p.key);
}
