export type TileRect = { left: number; top: number; width: number; height: number }

// Reserve each member's header and a little reading space before distributing
// the remainder. Capped, line-sized demand buckets avoid per-character changes.
export function allocateHeights(weights: number[], total: number, minimum: number): number[] {
  if (!weights.length) return []
  const floor = Math.min(minimum, Math.max(0, total) / weights.length)
  const extra = Math.max(0, total - floor * weights.length)
  const sum = weights.reduce((a, b) => a + b, 0)
  return weights.map(weight => floor + extra * weight / sum)
}
export function adaptiveLayout(width: number, height: number, demands: number[], gap = 8, minimum = 80): TileRect[] {
  const count = Math.min(8, demands.length)
  if (!count) return []
  const weights = demands.slice(0, count).map(demand => 1 + Math.min(6, Math.ceil(Math.max(0, demand) / 32)))
  const rectangles: TileRect[] = []
  if (count <= 2) {
    let top = 0
    for (const h of allocateHeights(weights, Math.max(0, height - gap * (count - 1)), minimum)) {
      rectangles.push({ left: 0, top, width, height: h }); top += h + gap
    }
    return rectangles
  }
  const spanning = count % 2 === 1
  const start = spanning ? 1 : 0
  const rows = (count - start) / 2
  const halfWidth = Math.max(0, (width - gap) / 2)
  let offset = 0
  if (spanning) {
    // Average each pair only to size the shared top tile; columns below it
    // remain independent. Equal content produces the original equal rows.
    const rowWeights = [weights[0]!]
    for (let i = 1; i < count; i += 2) rowWeights.push((weights[i]! + weights[i + 1]!) / 2)
    const firstHeight = allocateHeights(rowWeights, Math.max(0, height - gap * rows), minimum)[0]!
    rectangles[0] = { left: 0, top: 0, width, height: firstHeight }
    offset = firstHeight + gap
  }
  for (let column = 0; column < 2; column++) {
    const indices = Array.from({ length: rows }, (_, row) => start + row * 2 + column)
    const heights = allocateHeights(indices.map(i => weights[i]!), Math.max(0, height - offset - gap * (rows - 1)), minimum)
    let top = offset
    indices.forEach((index, row) => {
      rectangles[index] = { left: column * (halfWidth + gap), top, width: halfWidth, height: heights[row]! }
      top += heights[row]! + gap
    })
  }
  return rectangles
}
