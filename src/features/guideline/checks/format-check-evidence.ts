import { type CheckEvidence, formatCardBlockEvidence } from '../blocks/projection'
import { compact } from '../utils/block-text'

/**
 * 동결된 CheckSession rulesetSnapshot에만 남아 있는 근거 꼴. 만든 블록은 지워졌지만(콜아웃·콘텐츠 열·
 * 블록 층은 2026-09-04, 개명 전 판별자 columnUnit·policyCallout은 그 이전) 스냅샷은 그대로이므로 읽는
 * 자리만 유지한다. 새로 만들지 않는다.
 */
type FrozenEvidence =
	| { type: 'contentColumns' | 'columnUnit'; columns: { heading?: string; body?: string }[] }
	| { type: 'callout' | 'policyCallout'; kind: string; title?: string; items: string[] }
	| { type: 'block'; childCount: number }

const CALLOUT_KIND_LABEL: Record<string, string> = {
	must: '반드시',
	recommended: '권장',
	dont: '금지',
}
const FROZEN_TYPES = new Set(['contentColumns', 'columnUnit', 'callout', 'policyCallout', 'block'])

function formatFrozenEvidence(evidence: FrozenEvidence): string {
	switch (evidence.type) {
		case 'contentColumns':
		case 'columnUnit':
			return evidence.columns
				.map((column) => compact([column.heading, column.body]).join('\n'))
				.filter(Boolean)
				.join('\n\n')
		case 'callout':
		case 'policyCallout':
			return compact([
				evidence.title ?? CALLOUT_KIND_LABEL[evidence.kind],
				...evidence.items.map((item) => `- ${item}`),
			]).join('\n')
		case 'block':
			return `leaf ${evidence.childCount}개를 담은 블록`
	}
}

/** 구조화 evidence를 기존 평문 소비 경계에 맞게 변환한다. */
export function formatCheckEvidence(evidence: CheckEvidence | string): string {
	if (typeof evidence === 'string') return evidence
	if (FROZEN_TYPES.has(evidence.type)) return formatFrozenEvidence(evidence as never)

	switch (evidence.type) {
		case 'document':
			return compact([
				evidence.description,
				...evidence.blocks.map(formatCheckEvidence),
			]).join('\n\n')
		case 'section':
			// 동결 스냅샷의 섹션 근거는 블록 층이 있던 시절의 `blocks`를 가질 수 있다 — 있으면 함께 읽는다.
			return compact([
				formatCardBlockEvidence(evidence),
				...((evidence as { blocks?: CheckEvidence[] }).blocks ?? []).map(
					formatCheckEvidence,
				),
			]).join('\n\n')
		case 'base':
		case 'overview':
		case 'examples':
			return formatCardBlockEvidence(evidence)
	}
}
