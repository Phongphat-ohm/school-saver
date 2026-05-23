const headingPattern = /^(#{1,6})\s*(.+)$/;
const unorderedListPattern = /^[-*+]\s*(.+)$/;
const orderedListPattern = /^\d+[.)]\s*(.+)$/;
const blockquotePattern = /^>\s?(.*)$/;
const horizontalRulePattern = /^([-*_])(?:\s*\1){2,}\s*$/;
const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function renderSafeMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  const lines = normalized.split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = trimmed.match(headingPattern);
    if (heading) {
      const level = Math.min(6, heading[1].length);
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (horizontalRulePattern.test(trimmed)) {
      html.push("<hr />");
      index += 1;
      continue;
    }

    if (unorderedListPattern.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && unorderedListPattern.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(unorderedListPattern, "$1"));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (orderedListPattern.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && orderedListPattern.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(orderedListPattern, "$1"));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (blockquotePattern.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && blockquotePattern.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(blockquotePattern, "$1"));
        index += 1;
      }
      html.push(`<blockquote>${quoteLines.map(renderInlineMarkdown).join("<br />")}</blockquote>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      const current = lines[index].trim();
      if (
        headingPattern.test(current) ||
        unorderedListPattern.test(current) ||
        orderedListPattern.test(current) ||
        blockquotePattern.test(current) ||
        horizontalRulePattern.test(current) ||
        current.startsWith("```")
      ) {
        break;
      }
      paragraphLines.push(current);
      index += 1;
    }
    html.push(`<p>${paragraphLines.map(renderInlineMarkdown).join("<br />")}</p>`);
  }

  return html.join("");
}

export function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(markdownLinkPattern, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
