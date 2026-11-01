export interface Point {
  x: number;
  y: number;
}

/**
 * Calculates the Euclidean distance between two points.
 */
function dist(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Calculates the Eye Aspect Ratio (EAR) for a single eye.
 * 
 * The EAR is calculated using 6 facial landmarks for the eye:
 * p1, p4 are the horizontal landmarks.
 * p2, p6 and p3, p5 are the vertical landmarks.
 * 
 * Formula: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 * 
 * @param p1 - Horizontal landmark (left corner)
 * @param p2 - Vertical landmark (top-left)
 * @param p3 - Vertical landmark (top-right)
 * @param p4 - Horizontal landmark (right corner)
 * @param p5 - Vertical landmark (bottom-right)
 * @param p6 - Vertical landmark (bottom-left)
 * @returns The calculated EAR value.
 */
export function calculateEAR(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point,
  p5: Point,
  p6: Point
): number {
  const vertical1 = dist(p2, p6);
  const vertical2 = dist(p3, p5);
  const horizontal = dist(p1, p4);

  // Avoid division by zero
  if (horizontal === 0) return 0;

  return (vertical1 + vertical2) / (2 * horizontal);
}
