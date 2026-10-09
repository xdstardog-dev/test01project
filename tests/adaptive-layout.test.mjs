import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import ts from 'typescript'
const source = readFileSync(new URL('../src/adaptiveLayout.ts', import.meta.url), 'utf8')
const { adaptiveLayout } = await import('data:text/javascript;base64,' + Buffer.from(ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })).toString('base64'))
const near = (a, b) => Math.abs(a - b) < .001
for (let count = 1; count <= 8; count++) {
  for (const width of [296, 366, 456]) {
    for (const height of [240, 360, 520, 700]) {
      for (const demands of [Array(count).fill(0), Array(count).fill(96), Array.from({ length: count }, (_, i) => i === 0 ? 500 : 0), Array.from({ length: count }, (_, i) => i * 57)]) {
        const rects = adaptiveLayout(width, height, demands)
        assert.equal(rects.length, count)
        const rows = count <= 2 ? count : Math.ceil(count / 2)
        const minimum = Math.min(80, (height - (rows - 1) * 8) / rows)
        rects.forEach(rect => {
          assert.ok(rect.height >= minimum - .001)
          assert.ok(rect.left >= 0 && rect.top >= 0)
          assert.ok(rect.left + rect.width <= width + .001 && rect.top + rect.height <= height + .001)
        })
        for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
          const a = rects[i], b = rects[j]
          assert.ok(a.left + a.width <= b.left + .001 || b.left + b.width <= a.left + .001 || a.top + a.height <= b.top + .001 || b.top + b.height <= a.top + .001, '卡片不重叠')
        }
        if (demands.every(v => v === demands[0])) assert.ok(rects.every(r => near(r.height, rects[0].height)), '内容相等恢复均衡')
        if (count > 2) {
          const start = count % 2
          if (start) assert.equal(rects[0].width, width)
          for (let i = start; i < count; i++) {
            assert.equal(rects[i].left === 0, (i - start) % 2 === 0)
            if (i + 2 < count) assert.ok(rects[i + 2].top > rects[i].top)
          }
        }
      }
    }
  }
}
const asymmetric = adaptiveLayout(366, 520, [500, 0, 0, 0, 0, 0, 0, 0])
assert.ok(asymmetric[0].height > asymmetric[2].height)
assert.ok(asymmetric.filter((_, i) => i % 2 === 1).every(r => near(r.height, 124)), '右列保持均分，不受左列讲话影响')
assert.deepEqual(adaptiveLayout(366, 520, [33, 0]), adaptiveLayout(366, 520, [63, 0]), '同一高度桶内不调整')
console.log('通过：1～8 人多尺寸边界、最小高度、无重叠、顺序与跨列位置、独立列扩张、均衡恢复和高度分桶。')
