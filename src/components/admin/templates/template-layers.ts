import { isTemplateVectorNodeType } from '@/features/template-core/domain/template-node-types'
import {
	findImageCarrier,
	isImageColorizeOverlayId,
} from '@/features/template-core/runtime/compose-template-html.client'
import type { TemplateNodeConfig, TemplateNodeConfigMap } from '@/types/template'

export interface LayerRow {
	id: string
	/** 부모 노드 id — 루트 프레임은 없다. 겹침 순서를 **형제 안에서만** 바꾸므로 필요하다. */
	parentId?: string
	depth: number
	name: string
	figmaType: string
	tag: string
	isText: boolean
	isVector: boolean
	imageAddress?: 'self' | 'parent'
	carrierChildId?: string
	boxWidth?: number
	boxHeight?: number
	text: string
}

const TYPE_LABEL: Record<string, string> = {
	FRAME: '프레임',
	GROUP: '그룹',
	SECTION: '섹션',
	COMPONENT: '컴포넌트',
	COMPONENT_SET: '컴포넌트셋',
	INSTANCE: '인스턴스',
	TEXT: '텍스트',
	RECTANGLE: '사각형',
	ELLIPSE: '타원',
	LINE: '선',
	VECTOR: '벡터',
	STAR: '별',
	POLYGON: '다각형',
	REGULAR_POLYGON: '다각형',
	BOOLEAN_OPERATION: '불리언',
}

export const IMAGE_CONFIG_KEYS = [
	'backgroundImage',
	'generatedImageId',
	'imageTransform',
	'imageColorize',
	'imageInput',
] as const

export const typeLabel = (type: string) => TYPE_LABEL[type] ?? type

/**
 * 목록을 켜고 끈다. 보이는 옵션을 전부 켠 상태가 되면 목록 자체를 지워 "전부 허용"으로
 * 되돌린다. 저장값에 현재 보이지 않는 id(미발행 등)가 섞여 있을 수 있으므로, 그 값들은
 * 건드리지 않고 그대로 next에 남기되 collapse 판단(`all`과 길이 비교)에서는 `all`에 없는
 * id를 세지 않는다 — 안 그러면 보이지 않는 id가 "이미 켜진 것"으로 잘못 세어져 하나만
 * 꺼도 "전부 허용"으로 조용히 넓어진다.
 */
export function toggleAllowedId<T>(
	current: readonly T[] | undefined,
	all: readonly T[],
	id: T,
): T[] | undefined {
	const base = current ?? all
	const next = base.includes(id) ? base.filter((value) => value !== id) : [...base, id]
	const visibleCount = next.filter((value) => all.includes(value)).length
	return visibleCount === all.length ? undefined : next
}

export const canAssignImage = (layer: LayerRow) =>
	!layer.isText && !layer.isVector && layer.imageAddress === 'self'

/** 편집 UI가 있는 레이어 — 없는 레이어(부모 소관·img 고정 등)는 목록에서 비활성으로 그린다(정본 81:2, 안내 문구 제거). */
export const hasLayerEditor = (layer: LayerRow) =>
	layer.isText || layer.isVector || canAssignImage(layer)

function stylePx(element: Element, property: 'width' | 'height'): number | undefined {
	if (!(element instanceof HTMLElement)) return undefined
	const value = element.style[property]
	if (!value.endsWith('px')) return undefined
	const parsed = Number.parseFloat(value)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

const isCarrierFrameAddress = (node: Element | null, nodeDepth: number): boolean =>
	nodeDepth > 0 &&
	node instanceof HTMLElement &&
	!node.hasAttribute('data-image-carrier') &&
	node.style.overflow === 'hidden' &&
	findImageCarrier(node) !== null

export function parseLayers(html: string): LayerRow[] {
	const rows: LayerRow[] = []
	const doc = new DOMParser().parseFromString(html, 'text/html')

	const walk = (element: Element, depth: number, parentId?: string) => {
		if (isImageColorizeOverlayId(element.getAttribute('data-node-id') ?? '')) return
		const tag = element.tagName.toLowerCase()
		const figmaType =
			element.getAttribute('data-figma-type') || (tag === 'p' ? 'TEXT' : 'FRAME')
		const isText = tag === 'p'
		const selfMarked =
			element instanceof HTMLElement && element.hasAttribute('data-image-carrier')
		const frameAddress = isCarrierFrameAddress(element, depth)

		const id = element.getAttribute('data-node-id') || `${depth}-${rows.length}`
		rows.push({
			id,
			...(parentId ? { parentId } : {}),
			depth,
			name: element.getAttribute('data-name') || typeLabel(figmaType),
			figmaType,
			tag,
			isText,
			isVector:
				(isTemplateVectorNodeType(figmaType) || figmaType === 'POLYGON') &&
				(tag === 'img' ||
					(element instanceof HTMLElement && Boolean(element.style.maskImage))),
			imageAddress: selfMarked
				? isCarrierFrameAddress(element.parentElement, depth - 1)
					? 'parent'
					: 'self'
				: frameAddress
					? 'self'
					: undefined,
			carrierChildId: frameAddress
				? (findImageCarrier(element)?.getAttribute('data-node-id') ?? undefined)
				: undefined,
			boxWidth: stylePx(element, 'width'),
			boxHeight: stylePx(element, 'height'),
			text: isText ? (element.textContent ?? '') : '',
		})

		for (const child of Array.from(element.children)) walk(child, depth + 1, id)
	}

	for (const root of Array.from(doc.body.children)) walk(root, 0)
	return rows
}

/**
 * 레이어를 형제 안에서 한 칸 옮긴 `overrides`를 낸다 — **겹침 순서의 정본을 쓰는 유일한 함수**다.
 *
 * 🔴 `direction`은 **화면에서 보이는 방향**이다: `'up'` = 다른 레이어 위로 올라간다(= 문서에서
 *    뒤로 간다). 목록이 겹침의 역순으로 그려지므로 목록에서도 위로 간다.
 * 🔴 옮길 수 없으면 **`null`을 낸다.** 조용히 같은 값을 돌려주면 admin이 「눌렸는데 안 움직였다」를
 *    보여 주게 된다 — 부를 쪽이 손잡이를 잠그게 한다.
 * 🔑 부모의 `childOrder`에 **형제 전부**를 적는다. 부분만 적으면 목록에 없는 자식이 맨 위로
 *    올라가(compose 규칙) 안 건드린 레이어가 움직인다.
 */
export function moveLayer(
	configs: TemplateNodeConfigMap,
	rows: readonly LayerRow[],
	id: string,
	direction: 'up' | 'down',
): TemplateNodeConfigMap | null {
	const row = rows.find((candidate) => candidate.id === id)
	if (!row?.parentId) return null
	// 문서 순서 그대로의 형제 목록 — parseLayers가 문서 순서로 쌓는다.
	const siblings = rows.filter((candidate) => candidate.parentId === row.parentId)
	const at = siblings.findIndex((candidate) => candidate.id === id)
	// 화면에서 위로 = 문서에서 뒤로.
	const to = direction === 'up' ? at + 1 : at - 1
	if (at < 0 || to < 0 || to >= siblings.length) return null

	const order = siblings.map((candidate) => candidate.id)
	;[order[at], order[to]] = [order[to], order[at]]
	return {
		...configs,
		[row.parentId]: { ...configs[row.parentId], childOrder: order },
	}
}

export function pruneCarrierChildImageKeys(
	configs: TemplateNodeConfigMap,
	carrierChildId: string | undefined,
	patch: TemplateNodeConfig,
): TemplateNodeConfigMap {
	if (
		!carrierChildId ||
		!configs[carrierChildId] ||
		!IMAGE_CONFIG_KEYS.some((key) => key in patch)
	) {
		return configs
	}

	const next = { ...configs }
	const child = { ...next[carrierChildId] }
	for (const key of IMAGE_CONFIG_KEYS) delete child[key]
	if (Object.keys(child).length === 0) delete next[carrierChildId]
	else next[carrierChildId] = child
	return next
}
