import { Modal } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowLeft, Maximize2, Workflow } from "lucide-react";

import { createDiagramLayout } from "../lib/ai-diagram";
import type { DiagramLayout } from "../lib/ai-diagram";
import {
  calculateAnchoredScroll,
  calculatePinchZoom,
  gestureDistance,
  gestureMidpoint,
  type GesturePoint,
} from "../lib/pinch-zoom";
import type { AiDiagram, AiDiagramNode, AiLessonQuestionContext } from "../types";

const MINIMUM_DIAGRAM_ZOOM = 0.6;
const MAXIMUM_DIAGRAM_ZOOM = 3;

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

interface DiagramCanvasProps {
  layout: DiagramLayout;
  markerId: string;
  mode: "preview" | "expanded";
  zoom?: number;
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
}

function DiagramCanvas({
  layout,
  markerId,
  mode,
  zoom = 1,
  selectedNodeId,
  onNodeSelect,
}: DiagramCanvasProps) {
  const isExpanded = mode === "expanded";

  return (
    <svg
      className={`ai-diagram-svg ai-diagram-svg--${mode}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        aspectRatio: `${layout.width} / ${layout.height}`,
        ...(isExpanded
          ? {
              minWidth: layout.width * zoom,
              width: `${zoom * 100}%`,
            }
          : undefined),
      }}
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
        const isSelected = node.id === selectedNodeId;
        return (
          <g
            aria-label={onNodeSelect ? `${node.label}. ${node.detail}` : undefined}
            aria-pressed={onNodeSelect ? isSelected : undefined}
            className={`ai-diagram-node${isSelected ? " is-selected" : ""}`}
            key={node.id}
            role={onNodeSelect ? "button" : undefined}
            tabIndex={onNodeSelect ? 0 : undefined}
            onClick={onNodeSelect ? () => onNodeSelect(node.id) : undefined}
            onKeyDown={
              onNodeSelect
                ? (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onNodeSelect(node.id);
                  }
                : undefined
            }
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
  );
}

interface DiagramDetailProps {
  node: AiDiagramNode;
  onAsk?: () => void;
}

function DiagramDetail({ node, onAsk }: DiagramDetailProps) {
  return (
    <div aria-live="polite" className="ai-diagram-detail">
      <div>
        <strong>{node.label}</strong>
        <p>{node.detail}</p>
      </div>
      {onAsk ? (
        <button className="ai-lesson-ask" type="button" onClick={onAsk}>
          Спросить
        </button>
      ) : null}
    </div>
  );
}

export function AiLessonDiagram({ diagram, onAsk }: AiLessonDiagramProps) {
  const markerId = `diagram-arrow-${useId().replace(/:/g, "")}`;
  const layout = createDiagramLayout(diagram);
  const isMobile = useMediaQuery("(max-width: 820px)");
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [selectedNodeId, setSelectedNodeId] = useState(diagram.nodes[0]?.id ?? "");
  const pointersRef = useRef(new Map<number, GesturePoint>());
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const pinchRef = useRef<{
    startDistance: number;
    startZoom: number;
    startMidpoint: GesturePoint;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const selectedNode =
    diagram.nodes.find((node) => node.id === selectedNodeId) ?? diagram.nodes[0];
  const askAboutSelectedNode = () => {
    if (!selectedNode || !onAsk) return;
    onAsk({
      section: `Схема «${diagram.title}»: ${selectedNode.label}`,
      excerpt: selectedNode.detail,
    });
  };
  const resetGesture = () => {
    pointersRef.current.clear();
    panRef.current = null;
    pinchRef.current = null;
    suppressClickRef.current = false;
    zoomRef.current = 1;
    setZoom(1);
  };
  const openExpanded = () => {
    resetGesture();
    setIsExpanded(true);
  };
  const closeExpanded = () => {
    setIsExpanded(false);
    resetGesture();
  };
  const startPinch = (container: HTMLDivElement) => {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return false;
    const first = points[0]!;
    const second = points[1]!;
    const midpoint = gestureMidpoint(first, second);
    const bounds = container.getBoundingClientRect();
    pinchRef.current = {
      startDistance: gestureDistance(first, second),
      startZoom: zoomRef.current,
      startMidpoint: {
        x: midpoint.x - bounds.left,
        y: midpoint.y - bounds.top,
      },
      startScrollLeft: container.scrollLeft,
      startScrollTop: container.scrollTop,
    };
    panRef.current = null;
    return true;
  };
  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size >= 2) {
      startPinch(event.currentTarget);
      suppressClickRef.current = true;
      event.preventDefault();
      return;
    }
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
      moved: false,
    };
    suppressClickRef.current = false;
  };
  const continuePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const points = [...pointersRef.current.values()];
      const first = points[0]!;
      const second = points[1]!;
      const midpoint = gestureMidpoint(first, second);
      const bounds = event.currentTarget.getBoundingClientRect();
      const viewportMidpoint = {
        x: midpoint.x - bounds.left,
        y: midpoint.y - bounds.top,
      };
      const nextZoom = calculatePinchZoom(
        pinch.startZoom,
        pinch.startDistance,
        gestureDistance(first, second),
        MINIMUM_DIAGRAM_ZOOM,
        MAXIMUM_DIAGRAM_ZOOM,
      );
      const nextScrollLeft = calculateAnchoredScroll(
        pinch.startScrollLeft,
        pinch.startMidpoint.x,
        viewportMidpoint.x,
        pinch.startZoom,
        nextZoom,
      );
      const nextScrollTop = calculateAnchoredScroll(
        pinch.startScrollTop,
        pinch.startMidpoint.y,
        viewportMidpoint.y,
        pinch.startZoom,
        nextZoom,
      );
      const container = event.currentTarget;
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      suppressClickRef.current = true;
      event.preventDefault();
      window.requestAnimationFrame(() => {
        container.scrollLeft = nextScrollLeft;
        container.scrollTop = nextScrollTop;
      });
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - pan.startX;
    const deltaY = event.clientY - pan.startY;
    if (!pan.moved && Math.hypot(deltaX, deltaY) < 6) return;
    pan.moved = true;
    event.preventDefault();
    event.currentTarget.scrollLeft = pan.scrollLeft - deltaX;
    event.currentTarget.scrollTop = pan.scrollTop - deltaY;
  };
  const stopPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pinchRef.current) {
      pinchRef.current = null;
      suppressClickRef.current = true;
      const remaining = [...pointersRef.current.entries()][0];
      if (remaining) {
        const [pointerId, point] = remaining;
        panRef.current = {
          pointerId,
          startX: point.x,
          startY: point.y,
          scrollLeft: event.currentTarget.scrollLeft,
          scrollTop: event.currentTarget.scrollTop,
          moved: true,
        };
      } else {
        panRef.current = null;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    suppressClickRef.current = pan.moved;
    if (pan.moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <>
      <article className="ai-diagram-card">
        <header>
          <Workflow aria-hidden="true" size={20} />
          <div>
            <h4>{diagram.title}</h4>
            <p>{diagram.description}</p>
          </div>
        </header>

        <button
          aria-label={`Увеличить схему «${diagram.title}»`}
          className="ai-diagram-preview"
          type="button"
          onClick={openExpanded}
        >
          <DiagramCanvas
            layout={layout}
            markerId={`${markerId}-preview`}
            mode="preview"
            selectedNodeId={selectedNode?.id}
          />
          <span className="ai-diagram-expand-hint">
            <Maximize2 aria-hidden="true" size={16} />
            Увеличить
          </span>
        </button>

        {selectedNode ? (
          <DiagramDetail
            node={selectedNode}
            onAsk={onAsk ? askAboutSelectedNode : undefined}
          />
        ) : null}
      </article>

      <Modal
        centered
        classNames={{
          body: "ai-diagram-modal-body",
          content: "ai-diagram-modal-content",
          header: "ai-diagram-modal-header",
          title: "ai-diagram-modal-title",
        }}
        closeButtonProps={{ "aria-label": "Закрыть увеличенную схему" }}
        fullScreen={Boolean(isMobile)}
        opened={isExpanded}
        overlayProps={{ backgroundOpacity: 0.78, blur: 8 }}
        size="min(1200px, calc(100vw - 32px))"
        title={diagram.title}
        zIndex={100}
        onClose={closeExpanded}
      >
        <div
          className="ai-diagram-expanded-scroll"
          onClickCapture={(event) => {
            if (!suppressClickRef.current) return;
            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerCancel={stopPan}
          onPointerDown={startPan}
          onPointerMove={continuePan}
          onPointerUp={stopPan}
        >
          <DiagramCanvas
            layout={layout}
            markerId={`${markerId}-expanded`}
            mode="expanded"
            zoom={zoom}
            selectedNodeId={selectedNode?.id}
            onNodeSelect={setSelectedNodeId}
          />
        </div>
        {selectedNode ? (
          <DiagramDetail
            node={selectedNode}
            onAsk={
              onAsk
                ? () => {
                    closeExpanded();
                    askAboutSelectedNode();
                  }
                : undefined
            }
          />
        ) : null}
        {isMobile ? (
          <button
            className="ai-diagram-mobile-close"
            type="button"
            onClick={closeExpanded}
          >
            <ArrowLeft aria-hidden="true" size={18} />
            Вернуться к уроку
          </button>
        ) : null}
      </Modal>
    </>
  );
}
