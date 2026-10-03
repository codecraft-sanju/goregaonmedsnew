// Strips control characters and collapses whitespace in free-text customer input.
// Matches control characters, zero-width characters and Unicode line/paragraph separators.
const CONTROL_CHARS = new RegExp('[' + ['\u0000-\u001F', '\u007F-\u009F', '\u200B-\u200F', '\u2028-\u202F', '\uFEFF'].join('') + ']', 'g');

export function cleanText(value) {
  return value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
