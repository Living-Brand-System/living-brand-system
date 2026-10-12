import { DomUtils, ElementType, parseDocument } from 'htmlparser2'
import { isTemplateVectorNodeType, TEMPLATE_BACKGROUND_FIGMA_TYPE } from './template-node-types'

/**
 * 가져올 때의 레이어 겹침 순서(사용자 결정 2026-10-12) — 아래부터 배경 < 이미지 < 텍스트 < CI.
 * Figma 가져오기가 한 번 쌓고, 그 뒤 순서는 Admin이 자유롭게 바꾼다(열 때마다 강제하지 않는다).
 * 같은 순위끼리는 Figma 순서를 지킨다.
 */
const TEMPLATE_LAYER_RANK = { background: 0, image: 1, text: 2, ci: 3 } as const

// domhandler는 htmlparser2의 하위 의존성이라 직접 import할 수 없다 — 노드 타입을 파서 반환값에서 끌어온다.
type ChildNode = ReturnType<typeof parseDocument>['children'][number]
type Element = Extract<ChildNode, { attribs: Record<string, string> }>

const isElement = (node: ChildNode): node is Element => node.type === ElementType.Tag

/**
 * 요소 하나의 순위. 텍스트·CI·배경은 자기 종류, 도형·이미지는 이미지 순위다.
 * 묶음(자식 있는 요소)은 안에서 **가장 아래 순위**를 따른다 — 그래야 묶음 안의 이미지가 형제 텍스트를 덮지 않는다.
 * ponytail: 한 묶음에 이미지와 CI가 섞이면 CI가 형제 텍스트 아래로 갈 수 있다. 막아야 하면 묶음을 펴는 쪽으로 간다.
 */
function rankOf(element: Element): number {
	const type = element.attribs['data-figma-type'] ?? ''
	if (type === TEMPLATE_BACKGROUND_FIGMA_TYPE) return TEMPLATE_LAYER_RANK.background
	if (element.name === 'p') return TEMPLATE_LAYER_RANK.text
	if (isTemplateVectorNodeType(type)) return TEMPLATE_LAYER_RANK.ci
	const children = element.children.filter(isElement)
	return children.length ? Math.min(...children.map(rankOf)) : TEMPLATE_LAYER_RANK.image
}

/** 형제 요소를 순위대로 안정 정렬한다. 요소 사이의 공백 텍스트는 제자리를 지킨다. 바꿨으면 true. */
function sortChildren(parent: { children: ChildNode[] }): boolean {
	let changed = false
	for (const child of parent.children) if (isElement(child) && sortChildren(child)) changed = true
	const slots = parent.children.flatMap((child, index) => (isElement(child) ? [index] : []))
	const sorted = slots
		.map((slot, order) => ({ element: parent.children[slot] as Element, order }))
		.sort(
			(left, right) =>
				rankOf(left.element) - rankOf(right.element) || left.order - right.order,
		)
	if (sorted.every(({ order }, position) => order === position)) return changed
	for (const [position, slot] of slots.entries()) parent.children[slot] = sorted[position].element
	return true
}

/**
 * html을 겹침 순서 규칙대로 다시 쌓는다. 서버·브라우저 어디서나 돈다(DOMParser를 쓰지 않는다).
 * 이미 그 순서면 **받은 문자열을 그대로** 돌려준다 — 다시 직렬화하면 태그 안 공백 서식이 바뀐다(실측 2026-10-12).
 */
export function orderTemplateLayers(html: string): string {
	if (!html) return html
	const document = parseDocument(html, { decodeEntities: false })
	if (!sortChildren(document)) return html
	return DomUtils.getOuterHTML(document.children, {
		decodeEntities: false,
		encodeEntities: false,
		emptyAttrs: true,
	})
}
