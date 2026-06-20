function renderInlineMarkdown(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  const lines = html.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const bullet = line.match(/^[-•]\s+(.+)/);
    const numbered = line.match(/^\d+\.\s+(.+)/);

    if (bullet) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      result.push(`<li>${bullet[1]}</li>`);
    } else if (numbered) {
      if (!inList) {
        result.push("<ol>");
        inList = true;
      }
      result.push(`<li>${numbered[1]}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (line.trim()) {
        result.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) result.push("</ul>");

  return result.join("");
}

interface Props {
  content: string;
  isTyping?: boolean;
}

export default function MessageContent({ content, isTyping }: Props) {
  if (isTyping) {
    return (
      <div className="typing-indicator">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    );
  }

  return (
    <div
      className="message-content"
      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(content) }}
    />
  );
}
