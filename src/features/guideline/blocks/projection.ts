import type { GuidelineDocument } from '@/payload-types'
import { compact } from '../utils/block-text'
import { extractTextFromLexical } from '../utils/lexical-text'
import type { CardBlockData } from './card-block'
import { blockEntry, fixedTitle } from './registry'

export type GuidelineBlock = NonNullable<GuidelineDocument['blocks']>[number]

export type CheckReferenceAssetRole = 'positive' | 'negative' | 'context'
export interface CheckReferenceAssetRef {
	id: number
	role: CheckReferenceAssetRole
}

/**
 * 카드 블록이 기계(AI 챗·검색·검수)에 보이는 표현. 디스플레이는 사람이 보는 것이고 제목·설명과
 * 카드 캡션만 평문이 된다. `type`은 블록 종류의 판별자다 — 근거 포매터가 그것으로 분기한다.
 * 🔴 `referenceAssets`는 항상 빈 배열이다 — 카드 이미지는 검수 근거가 아니다(docs/11, 2026-08-12 결정).
 */
export function projectCardBlock<T extends string>(
	block: CardBlockData & { anchor?: string | null },
	type: T,
	title = block.title,
) {
	const description = extractTextFromLexical(block.description)
	// 🔴 앵커도 평문에 넣는다. 섹션이 문서였을 때는 그 문서의 slug가 searchText에 들어가 검색에 걸렸다(2026-08-26).
	const anchor = block.anchor?.trim() || undefined
	const captions = compact(
		(block.cards ?? []).flatMap((card) => [
			card.caption?.title,
			extractTextFromLexical(card.caption?.description),
		]),
	)

	return {
		text: compact([title, anchor, description, ...captions]).join('\n'),
		evidence: {
			type,
			anchor,
			title: title?.trim() || undefined,
			description: description.trim() || undefined,
			captions,
		},
		referenceAssets: [] as CheckReferenceAssetRef[],
	}
}

type CardEvidence = ReturnType<typeof projectCardBlock<GuidelineBlock['blockType']>>['evidence']
/** 동결된 CheckSession 스냅샷의 옛 섹션 근거는 `captions`가 없다 — 읽는 자리에서는 선택으로 둔다. */
export type CheckBlockEvidence = Omit<CardEvidence, 'captions'> & { captions?: string[] }

export type CheckEvidence =
	| CheckBlockEvidence
	| {
			type: 'document'
			// 🔴 새로 만들지 않는다(토픽 설명은 2026-08-26에 제거). 동결된 CheckSession
			//    rulesetSnapshot에 남아 있을 수 있어 읽는 자리만 유지한다.
			description?: string
			blocks: CheckBlockEvidence[]
	  }

export interface CheckSourceSnapshot {
	evidence: CheckEvidence
	referenceAssets: CheckReferenceAssetRef[]
}
export interface BlockCheckSourceSnapshot {
	evidence: CheckBlockEvidence
	referenceAssets: CheckReferenceAssetRef[]
}

/** 블록 하나를 기계가 읽는 표현으로. 투영은 하나다 — 블록 종류는 판별자(`type`)로만 다르다. */
export function projectBlock(block: GuidelineBlock) {
	return projectCardBlock(
		block,
		block.blockType,
		fixedTitle(blockEntry(block.blockType)) ?? block.title,
	)
}

/** 블록 하나를 agent 컨텍스트용 평문으로. 빈 문자열은 호출측에서 걸러낸다. */
export function formatBlockForAgent(block: GuidelineBlock): string {
	return projectBlock(block).text
}

/** 블록 하나를 Check source evidence로. 카드 블록은 referenceAssets를 만들지 않는다. */
export function snapshotBlock(block: GuidelineBlock): BlockCheckSourceSnapshot {
	const { evidence, referenceAssets } = projectBlock(block)
	return { evidence, referenceAssets }
}

/** 근거 평문. 문단 사이는 빈 줄 — 동결 스냅샷을 읽던 옛 섹션 포매터와 같은 꼴이다. */
export function formatCardBlockEvidence(evidence: CheckBlockEvidence): string {
	return compact([evidence.title, evidence.description, ...(evidence.captions ?? [])]).join(
		'\n\n',
	)
}
