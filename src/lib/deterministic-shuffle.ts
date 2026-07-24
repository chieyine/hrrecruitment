/** Stable per-assignment shuffle so refreshing never changes question order. */
export function deterministicShuffle<T>(items: T[], seed: string): T[] {
  let state = 2166136261
  for (const character of seed) {
    state ^= character.charCodeAt(0)
    state = Math.imul(state, 16777619)
  }
  const output = [...items]
  for (let index = output.length - 1; index > 0; index--) {
    state = Math.imul(state ^ (state >>> 15), 2246822519)
    const target = Math.abs(state) % (index + 1)
    ;[output[index], output[target]] = [output[target], output[index]]
  }
  return output
}
