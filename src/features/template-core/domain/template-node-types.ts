const VECTOR_NODE_TYPES = new Set([
	'VECTOR',
	'BOOLEAN_OPERATION',
	'STAR',
	'LINE',
	'ELLIPSE',
	'REGULAR_POLYGON',
])

/** Template import와 레이어 편집기가 공유하는 벡터 노드 판별 계약. */
export const isTemplateVectorNodeType = (type: string): boolean => VECTOR_NODE_TYPES.has(type)

/**
 * 판 배경 레이어의 Figma 타입 표지 — 가져오기가 판의 이미지 배경을 맨 뒤 bg 레이어로 세울 때 붙이고,
 * 스튜디오 「Background」(색·이미지)는 이 레이어가 있으면 판 대신 여기에 칠한다.
 */
export const TEMPLATE_BACKGROUND_FIGMA_TYPE = 'BACKGROUND'
