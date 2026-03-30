/**
 * Replaces MARC non-sort markers (U+0098 → „, U+009C → ") with German
 * typographic quotation marks. Call this wherever title strings are rendered.
 */
export function decodeTitle(text: string): string {
  return text.replace(/\u0098/g, "\u201E").replace(/\u009C/g, "\u201C");
}
