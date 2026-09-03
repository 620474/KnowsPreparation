export interface GesturePoint {
  x: number;
  y: number;
}

export function gestureDistance(first: GesturePoint, second: GesturePoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

export function gestureMidpoint(first: GesturePoint, second: GesturePoint) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  };
}

export function calculatePinchZoom(
  startZoom: number,
  startDistance: number,
  currentDistance: number,
  minimumZoom: number,
  maximumZoom: number,
) {
  if (startDistance <= 0) return startZoom;
  return Math.min(
    maximumZoom,
    Math.max(minimumZoom, startZoom * (currentDistance / startDistance)),
  );
}

export function calculateAnchoredScroll(
  startScroll: number,
  startViewportPoint: number,
  currentViewportPoint: number,
  startZoom: number,
  nextZoom: number,
) {
  if (startZoom <= 0) return startScroll;
  return Math.max(
    0,
    (startScroll + startViewportPoint) * (nextZoom / startZoom) - currentViewportPoint,
  );
}
