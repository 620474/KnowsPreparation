export type LessonMarkdownBlock =
  | { type: "paragraph"; content: string }
  | { type: "heading"; content: string; level: number }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "code"; content: string; language: string };

export type LessonInlineToken = {
  type: "text" | "strong" | "code";
  content: string;
};

export function parseLessonInline(content: string): LessonInlineToken[] {
  const tokens: LessonInlineToken[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`\n]+`)/g;
  let cursor = 0;

  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      tokens.push({ type: "text", content: content.slice(cursor, index) });
    }
    const value = match[0];
    if (value.startsWith("**")) {
      tokens.push({ type: "strong", content: value.slice(2, -2) });
    } else {
      tokens.push({ type: "code", content: value.slice(1, -1) });
    }
    cursor = index + value.length;
  }

  if (cursor < content.length) {
    tokens.push({ type: "text", content: content.slice(cursor) });
  }

  return tokens.length > 0 ? tokens : [{ type: "text", content }];
}

export function parseLessonMarkdown(content: string): LessonMarkdownBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: LessonMarkdownBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    const paragraph = paragraphLines.join("\n").trim();
    if (paragraph) blocks.push({ type: "paragraph", content: paragraph });
    paragraphLines = [];
  };

  for (let index = 0; index < lines.length;) {
    const line = lines[index] ?? "";
    const fence = line.match(/^```([\w-]*)\s*$/);
    if (fence) {
      flushParagraph();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index] ?? "")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({
        type: "code",
        content: codeLines.join("\n"),
        language: fence[1] ?? "",
      });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        content: heading[2]?.trim() ?? "",
        level: heading[1]?.length ?? 2,
      });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^[-*]\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\d+\.\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
    } else {
      paragraphLines.push(line);
    }
    index += 1;
  }

  flushParagraph();
  return blocks;
}
