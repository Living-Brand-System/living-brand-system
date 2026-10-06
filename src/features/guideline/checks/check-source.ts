export { compact } from '../utils/block-text'

export type CheckReferenceAssetRole = 'positive' | 'negative' | 'context'
export interface CheckReferenceAssetRef {
	id: number
	role: CheckReferenceAssetRole
}

/** 현재 섹션과 동결된 CheckSession의 카드 블록 근거. CMS 저장 모델과 독립적이다. */
export interface CheckBlockEvidence {
	type: 'section' | 'base' | 'overview' | 'examples'
	anchor?: string
	title?: string
	description?: string
	captions?: string[]
}
export type CheckEvidence =
	| CheckBlockEvidence
	| {
			type: 'document'
			description?: string
			blocks: CheckBlockEvidence[]
	  }
export interface CheckSourceSnapshot {
	evidence: CheckEvidence
	referenceAssets: CheckReferenceAssetRef[]
}
