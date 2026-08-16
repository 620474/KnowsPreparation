import { Fragment } from "react";

import { parseLessonInline, parseLessonMarkdown } from "../lib/lesson-markdown";

interface LessonMarkdownProps {
  className?: string;
  content: string;
}

function InlineContent({ content }: { content: string }) {
  return parseLessonInline(content).map((token, index) => {
    const key = `${token.type}-${index}`;
    if (token.type === "strong") return <strong key={key}>{token.content}</strong>;
    if (token.type === "code") return <code key={key}>{token.content}</code>;
    return <Fragment key={key}>{token.content}</Fragment>;
  });
}

export function LessonMarkdown({ className, content }: LessonMarkdownProps) {
  return (
    <div className={["lesson-markdown", className].filter(Boolean).join(" ")}>
      {parseLessonMarkdown(content).map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === "heading") {
          return block.level <= 2 ? (
            <h3 key={key}><InlineContent content={block.content} /></h3>
          ) : (
            <h4 key={key}><InlineContent content={block.content} /></h4>
          );
        }
        if (block.type === "unordered-list") {
          return (
            <ul key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}><InlineContent content={item} /></li>
              ))}
            </ul>
          );
        }
        if (block.type === "ordered-list") {
          return (
            <ol key={key}>
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}><InlineContent content={item} /></li>
              ))}
            </ol>
          );
        }
        if (block.type === "code") {
          return <pre key={key}><code>{block.content}</code></pre>;
        }
        return <p key={key}><InlineContent content={block.content} /></p>;
      })}
    </div>
  );
}
