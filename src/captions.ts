export type Caption = {
  id: string
  memberId: string
  text: string
  state: 'interim' | 'final'
  finalizedAt: number | null
  holdMs: number
}

// Count readable characters, excluding punctuation and whitespace. Latin letters and
// numbers also count, so mixed-language speech receives a useful reading duration.
export function characterCount(text: string): number {
  return Array.from(text.replace(/[\p{P}\p{Z}\s]/gu, '')).length
}
export function displayDuration(text: string): number {
  const count = characterCount(text)
  return count <= 15 ? 3000 : count <= 30 ? 6000 : 10000
}
export function captionOpacity(caption: Caption, now: number): number {
  if (caption.finalizedAt === null) return 1
  return Math.max(0, Math.min(1, 1 - (now - caption.finalizedAt - caption.holdMs) / 2000))
}
export function receiveCaption(queue: Caption[], memberId: string, id: string, text: string, state: Caption['state'], now: number) {
  if (!text.trim()) return
  let caption = queue.find(c => c.memberId === memberId && c.id === id)
  if (caption?.state === 'final') return // Repeated recognition callbacks must not restart a timer.
  if (!caption) {
    caption = { id, memberId, text, state: 'interim', finalizedAt: null, holdMs: 0 }
    queue.push(caption)
  }
  caption.text = text
  caption.state = state
  if (state === 'final') {
    caption.finalizedAt = now
    caption.holdMs = displayDuration(text)
  }
}
export function expireCaptions(queue: Caption[], now: number): Caption[] {
  return queue.filter(c => c.finalizedAt === null || now < c.finalizedAt + c.holdMs + 2000)
}
