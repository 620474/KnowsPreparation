import { describe, expect, it } from "vitest";

import {
  calculateAnchoredScroll,
  calculatePinchZoom,
  gestureDistance,
  gestureMidpoint,
} from "./pinch-zoom";

describe("pinch zoom", () => {
  it("increases zoom when fingers move apart", () => {
    expect(calculatePinchZoom(1, 100, 160, 0.6, 3)).toBe(1.6);
  });

  it("decreases zoom when fingers move together and respects limits", () => {
    expect(calculatePinchZoom(1, 100, 40, 0.6, 3)).toBe(0.6);
    expect(calculatePinchZoom(2, 100, 200, 0.6, 3)).toBe(3);
  });

  it("calculates distance and midpoint between touches", () => {
    expect(gestureDistance({ x: 10, y: 20 }, { x: 40, y: 60 })).toBe(50);
    expect(gestureMidpoint({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual({
      x: 25,
      y: 40,
    });
  });

  it("keeps the content below the gesture midpoint", () => {
    expect(calculateAnchoredScroll(100, 50, 50, 1, 2)).toBe(250);
    expect(calculateAnchoredScroll(100, 50, 70, 1, 2)).toBe(230);
  });
});
