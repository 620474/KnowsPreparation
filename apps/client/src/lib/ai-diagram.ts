import type { AiDiagram, AiDiagramEdge, AiDiagramNode } from "../types";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 92;
const COLUMN_GAP = 86;
const ROW_GAP = 72;
const PADDING = 34;

export interface PositionedDiagramNode extends AiDiagramNode {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface PositionedDiagramEdge extends AiDiagramEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
}

export interface DiagramLayout {
  width: number;
  height: number;
  nodes: PositionedDiagramNode[];
  edges: PositionedDiagramEdge[];
}

function positionNode(node: AiDiagramNode): PositionedDiagramNode {
  const x = PADDING + node.column * (NODE_WIDTH + COLUMN_GAP);
  const y = PADDING + node.row * (NODE_HEIGHT + ROW_GAP);

  return {
    ...node,
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    centerX: x + NODE_WIDTH / 2,
    centerY: y + NODE_HEIGHT / 2,
  };
}

function positionEdge(
  edge: AiDiagramEdge,
  nodeMap: Map<string, PositionedDiagramNode>,
): PositionedDiagramEdge | null {
  const source = nodeMap.get(edge.from);
  const target = nodeMap.get(edge.to);
  if (!source || !target) return null;

  const deltaX = target.centerX - source.centerX;
  const deltaY = target.centerY - source.centerY;
  let x1 = source.centerX;
  let y1 = source.centerY;
  let x2 = target.centerX;
  let y2 = target.centerY;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    const direction = deltaX >= 0 ? 1 : -1;
    x1 += direction * (source.width / 2);
    x2 -= direction * (target.width / 2);
  } else {
    const direction = deltaY >= 0 ? 1 : -1;
    y1 += direction * (source.height / 2);
    y2 -= direction * (target.height / 2);
  }

  return {
    ...edge,
    x1,
    y1,
    x2,
    y2,
    labelX: (x1 + x2) / 2,
    labelY: (y1 + y2) / 2 - 8,
  };
}

export function createDiagramLayout(diagram: AiDiagram): DiagramLayout {
  const nodes = diagram.nodes.map(positionNode);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edges = diagram.edges.flatMap((edge) => {
    const positionedEdge = positionEdge(edge, nodeMap);
    return positionedEdge ? [positionedEdge] : [];
  });
  const maxColumn = Math.max(0, ...diagram.nodes.map((node) => node.column));
  const maxRow = Math.max(0, ...diagram.nodes.map((node) => node.row));

  return {
    width: Math.max(620, PADDING * 2 + (maxColumn + 1) * NODE_WIDTH + maxColumn * COLUMN_GAP),
    height: Math.max(300, PADDING * 2 + (maxRow + 1) * NODE_HEIGHT + maxRow * ROW_GAP),
    nodes,
    edges,
  };
}
