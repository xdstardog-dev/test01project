import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { computed, reactive, watch, ref, nextTick, effectScope } from 'vue'
const script = readFileSync(new URL('../src/components/MemberCaptionGrid.vue', import.meta.url), 'utf8')
  .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
const props = reactive({ members: [{ id: 'a' }, { id: 'b' }], captions: [], now: 0 })
const context = vm.createContext({ computed, reactive, watch, ref, nextTick, onMounted: () => {}, onUnmounted: () => {}, defineProps: () => props, defineEmits: () => () => {} })
const scope = effectScope()
scope.run(() => vm.runInContext(ts.transpile(script + '\nglobalThis.latest = latestCaptionIds;', { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }), context))
const add = async (memberId, id, state = 'final') => { props.captions.push({ memberId, id, state, text: '字幕' }); await nextTick() }
await add('a', 'old-long')
await add('b', 'other')
await add('a', 'new-short', 'interim')
assert.equal(context.latest.get('a'), 'new-short')
assert.equal(context.latest.get('b'), 'other')
props.captions.at(-1).text = '不断增长的字幕'; props.captions.at(-1).state = 'final'; await nextTick()
assert.equal(context.latest.get('a'), 'new-short')
props.captions = props.captions.filter(c => c.id !== 'new-short'); await nextTick()
assert.equal(context.latest.get('a'), 'new-short', '最新短句先过期时，不重新加粗旧长句')
await add('a', 'next')
assert.equal(context.latest.get('a'), 'next')
props.captions = []; await nextTick(); await add('a', 'fresh')
assert.equal(context.latest.get('a'), 'fresh')
props.members = props.members.filter(m => m.id !== 'b'); await nextTick()
assert.equal(context.latest.has('b'), false)
scope.stop()
console.log('通过：每人最新句独立加粗、Interim 原位确认、最新句删除不回退、空队列新句及成员清理。')
