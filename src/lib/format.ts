export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return (v >= 100 ? Math.round(v) : v.toFixed(v < 10 ? 1 : 0)) + "K";
  }
  const v = n / 1_000_000;
  return (v >= 100 ? Math.round(v) : v.toFixed(v < 10 ? 1 : 0)) + "M";
}
