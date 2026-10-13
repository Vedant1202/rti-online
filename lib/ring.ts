/** Geometry for a circular progress ring: how much of the circle to draw for `value` out of `total`. */
export function ringGeometry(value: number, total: number, radius: number) {
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? Math.max(0, Math.min(value / total, 1)) : 0;
  return { circumference, offset: circumference * (1 - fraction), fraction };
}
