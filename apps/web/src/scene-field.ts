/** Forward chapter travel: reveal after half enters; hold until half has left. */
export function chapterReveal(shift: number, height: number) {
  const phase = shift / Math.max(1, height);
  return Math.max(0, Math.min(1, phase >= 0 ? 1 - phase * 2 : 2 + phase * 2));
}

/** A soft, centered expansion in physical stage pixels. */
export function sceneField(
  width: number,
  height: number,
  progress: number,
  options: { center?: { x: number; y: number }; hard?: boolean } = {},
) {
  const p = Math.max(0, Math.min(1, progress));
  const center = options.center ?? { x: width / 2, y: height / 2 };
  const reach = Math.max(
    Math.hypot(center.x, center.y),
    Math.hypot(width - center.x, center.y),
    Math.hypot(center.x, height - center.y),
    Math.hypot(width - center.x, height - center.y),
  );
  const feather = options.hard ? 0 : Math.max(28, reach * 0.09);
  const outer = p * (reach + feather);
  return {
    cx: center.x,
    cy: center.y,
    inner: Math.max(0, outer - feather),
    outer,
    strength: p * p * (3 - 2 * p),
    width,
    height,
  };
}
export function mixInk(a: string, b: string, amount: number) {
  if (amount <= 0) return a;
  if (amount >= 1) return b;
  const rgb = (color: string) =>
    color.startsWith('#')
      ? [0, 1, 2].map((i) => parseInt(color.slice(1 + i * 2, 3 + i * 2), 16))
      : (color.match(/[\d.]+/g) ?? ['43', '79', '61']).slice(0, 3).map(Number);
  const x = rgb(a),
    y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * amount)).join(',')})`;
}
export function fieldGradient(
  field: ReturnType<typeof sceneField>,
  x: number,
  y: number,
  _height: number,
  a: string,
  b: string,
) {
  return `radial-gradient(circle at ${field.cx - x}px ${field.cy - y}px,${mixInk(a, b, field.strength)} ${field.inner}px,${a} ${field.outer}px)`;
}
