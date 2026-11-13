export function splitKeywords(value: string): string[] {
  return value
    .split(/[,、，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}
