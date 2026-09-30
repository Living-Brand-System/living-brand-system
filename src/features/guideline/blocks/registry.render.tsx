import type { ReactNode } from 'react'
import { CardBlock } from './card-block'
import type { GuidelineBlock } from './projection'
import { blockEntry, fixedTitle } from './registry'

/**
 * 블록 렌더 — `registry.ts`의 항목을 같은 id로 갈라 그린다. 렌더는 하나(`CardBlock`)고, 앵커 블록(section)은
 * 제목이 있을 때만 `id`를 얻는다 — 제목 없는 섹션은 h2·앵커·목차 항목을 만들지 않는다(히어로용).
 * 컴포넌트를 레지스트리 항목에 직접 싣지 않는 이유는 그 모듈을 payload.config가 Node에서 읽기 때문이다.
 */
export function renderBlock(block: GuidelineBlock): ReactNode {
	const entry = blockEntry(block.blockType)
	const anchor =
		'anchor' in block && block.title?.trim() ? (block.anchor ?? undefined) : undefined
	return <CardBlock block={block} title={fixedTitle(entry) ?? block.title} id={anchor} />
}
