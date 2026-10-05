export function ok<T>(data: T, extra?: Record<string, unknown>) {
  return {
    success: true as const,
    data,
    meta: { simulated: true, ...extra },
  };
}
