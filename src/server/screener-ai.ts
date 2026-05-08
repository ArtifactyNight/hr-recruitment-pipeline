export async function screeningGenerateText<T>(
  fn: () => Promise<T>,
): Promise<T> {
  return await fn();
}
