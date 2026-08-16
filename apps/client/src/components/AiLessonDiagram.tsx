import { useId, useState } from "react";
import { Workflow } from "lucide-react";

import { createDiagramLayout } from "../lib/ai-diagram";
import type { AiDiagram, AiLessonQuestionContext } from "../types";

interface AiLessonDiagramProps {
  diagram: AiDiagram;
  onAsk?: (context: AiLessonQuestionContext) => void;
}

function splitLabel(label: string) {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines.at(-1);
    if (!currentLine || currentLine.length + word.length + 1 > 20) {
      if (lines.length === 3) {
        lines[2] = `${lines[2]}…`;
        break;
      }
      lines.push(word);
      continue;
    }
    lines[lines.length - 1] = `${currentLine} ${word}`;
  }

  return lines;
}

export function AiLessonDiagram({ diagram, onAsk }: AiLessonDiagramProps) {
  const markerId = `diagram-arrow-${useId().replace(/:/g, "")}`;
  const layout = createDiagramLayout(diagram);
  const [selectedNodeId, setSelectedNodeId] = useState(diagram.nodes[0]?.id ?? "");
  const selectedNode =
    diagram.nodes.find((node) => node.id === selectedNodeId) ?? diagram.nodes[0];

  return (
    <article className="ai-diagram-card">
      <header>
        <Workflow aria-hidden="true" size={20} />
        <div>
          <h4>{diagram.title}</h4>
          <p>{diagram.description}</p>
        </div>
      </header>

      <div className="ai-diagram-scroll">
        <svg
          aria-label={`${diagram.title}. Нажимай на блоки, чтобы читать пояснения.`}
          className="ai-diagram-svg"
          role="img"
          style={{ minWidth: layout.width }}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
        >
          <defs>
            <marker
              id={markerId}
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>

          {layout.edges.map((edge, index) => (
            <g className="ai-diagram-edge" key={`${edge.from}-${edge.to}-${index}`}>
              <line
                markerEnd={`url(#${markerId})`}
                x1={edge.x1}
                x2={edge.x2}
                y1={edge.y1}
                y2={edge.y2}
              />
              {edge.label ? (
                <text textAnchor="middle" x={edge.labelX} y={edge.labelY}>
                  {edge.label}
                </text>
              ) : null}
            </g>
          ))}

          {layout.nodes.map((node) => {
            const labelLines = splitLabel(node.label);
            const isSelected = node.id === selectedNode?.id;
            return (
              <g
                aria-label={`${node.label}. ${node.detail}`}
                aria-pressed={isSelected}
                className={`ai-diagram-node${isSelected ? " is-selected" : ""}`}
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setSelectedNodeId(node.id);
                }}
                role="button"
                tabIndex={0}
              >
                <rect height={node.height} rx="14" width={node.width} x={node.x} y={node.y} />
                <text textAnchor="middle" x={node.centerX} y={node.centerY}>
                  {labelLines.map((line, index) => (
                    <tspan
                      dy={index === 0 ? `${-(labelLines.length - 1) * 0.62}em` : "1.25em"}
                      key={`${line}-${index}`}
                      x={node.centerX}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode ? (
        <div aria-live="polite" className="ai-diagram-detail">
          <div>
            <strong>{selectedNode.label}</strong>
            <p>{selectedNode.detail}</p>
          </div>
          {onAsk ? (
            <button
              className="ai-lesson-ask"
              type="button"
              onClick={() =>
                onAsk({
                  section: `Схема «${diagram.title}»: ${selectedNode.label}`,
                  excerpt: selectedNode.detail,
                })
              }
            >
              Спросить
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
