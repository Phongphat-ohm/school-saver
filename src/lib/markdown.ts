const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

export function renderSafeMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      if (/^#{1,3}\s+/.test(block)) {
        const level = Math.min(3, block.match(/^#+/)?.[0].length ?? 2);
        return `<h${level}>${renderInlineMarkdown(block.replace(/^#{1,3}\s+/, ""))}</h${level}>`;
      }
      return `<p>${lines.map(renderInlineMarkdown).join("<br />")}</p>`;
    })
    .join("");
}

function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(markdownLinkPattern, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
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
