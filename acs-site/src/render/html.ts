const MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for HTML content and attribute values. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => MAP[c] ?? c);
}
