// Basic text moderation. Not a substitute for human review or proper moderation services,
// but blocks the most common abusive/explicit text in bios, names, and messages.
const BANNED_PATTERNS: RegExp[] = [
  /\bn[\W_]*i[\W_]*g[\W_]*g[\W_]*(e|a)r?s?\b/i,
  /\bf[\W_]*a[\W_]*g[\W_]*(g?o?t)?s?\b/i,
  /\bk[\W_]*i[\W_]*k[\W_]*e\b/i,
  /\bc[\W_]*h[\W_]*i[\W_]*n[\W_]*k\b/i,
  /\br[\W_]*e[\W_]*t[\W_]*a[\W_]*r[\W_]*d\b/i,
  /\bcunt\b/i,
  /\bwhore\b/i,
  /\bslut\b/i,
  /\brape\b/i,
  /\bpedo(phile)?\b/i,
  /\bchild\s*porn\b/i,
  /\bcp\b\s*(pic|photo|vid)/i,
  // Contact-info / off-platform solicitation common in spam/escort posts
  /\b(whats\s*app|telegram|snapchat|cashapp|venmo|onlyfans|of\.com)\b/i,
  /\b(escort|hookup\s*now|paid\s*sex|sugar\s*(daddy|baby))\b/i,
  // Phone numbers (loose) and emails
  /(\+?\d[\d\s().-]{7,}\d)/,
  /[\w.+-]+@[\w-]+\.[\w.-]+/i,
];

export type ModerationResult = { ok: true } | { ok: false; reason: string };

export function moderateText(text: string, field: string): ModerationResult {
  const t = (text ?? "").trim();
  if (!t) return { ok: true };
  for (const re of BANNED_PATTERNS) {
    if (re.test(t)) {
      return {
        ok: false,
        reason: `${field} contains content that isn't allowed (slurs, contact info, or explicit/illegal terms).`,
      };
    }
  }
  return { ok: true };
}
