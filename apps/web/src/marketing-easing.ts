/** Exact endpoints, fast launch and a long, soft arrival. */
export function easeOutExpo(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return t === 0 || t === 1 ? t : 1 - 2 ** (-10 * t);
}
