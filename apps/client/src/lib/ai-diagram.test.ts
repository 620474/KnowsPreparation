import { describe, expect, it } from "vitest";

import type { AiDiagram } from "../types";
import { createDiagramLayout } from "./ai-diagram";

const diagram: AiDiagram = {
  title: "Event loop",
  description: "Порядок выполнения",
  nodes: [
    {
      id: "stack",
      label: "Стек вызовов",
      detail: "Синхронный код",
      row: 0,
      column: 0,
    },
    {
      id: "microtasks",
      label: "Микрозадачи",
      detail: "Promise callbacks",
      row: 0,
      column: 1,
    },
    {
      id: "render",
      label: "Рендер",
      detail: "Обновление экрана",
      row: 1,
      column: 1,
    },
  ],
  edges: [
    { from: "stack", to: "microtasks", label: "стек пуст" },
    { from: "microtasks", to: "render", label: "очередь пуста" },
    { from: "missing", to: "stack", label: "невалидная связь" },
  ],
};

describe("createDiagramLayout", () => {
  it("positions nodes on a deterministic grid", () => {
    const layout = createDiagramLayout(diagram);

    expect(layout.width).toBe(620);
    expect(layout.height).toBe(324);
    expect(layout.nodes[0]).toMatchObject({ x: 34, y: 34, centerX: 129, centerY: 80 });
    expect(layout.nodes[2]).toMatchObject({ x: 310, y: 198, centerX: 405, centerY: 244 });
  });

  it("connects node borders and ignores missing endpoints", () => {
    const layout = createDiagramLayout(diagram);

    expect(layout.edges).toHaveLength(2);
    expect(layout.edges[0]).toMatchObject({ x1: 224, y1: 80, x2: 310, y2: 80 });
    expect(layout.edges[1]).toMatchObject({ x1: 405, y1: 126, x2: 405, y2: 198 });
  });
});
