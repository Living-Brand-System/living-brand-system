import type { CheckStatus, HeuristicCriterion } from '@/features/asset-check/checkers/types'
import type {
	CheckEvidence,
	CheckReferenceAssetRole,
} from '@/features/guideline/checks/check-source'
import type { RuleExecutor } from '@/features/quality-rule/rule-executor'

export interface CheckReferenceAsset {
	name: string
	url: string
	mimeType: string
	role: CheckReferenceAssetRole
}

export interface CheckerSummary {
	key: string
	type: RuleExecutor
	implementationKey?: string
}

export interface RuntimeCheck {
	key: string
	title: string
	titleKo?: string
	tier?: 'recommended' | 'required'
	/** 기존 CheckSession snapshot에는 없을 수 있다. 새 snapshot은 항상 포함한다. */
	source?: { documentId: number }
	/** 화면에 표시할 Checker 계약이다. */
	checker: CheckerSummary
	/** 아래 필드는 기존 CheckSession snapshot과 런타임 실행 계약이다. */
	executor: RuleExecutor
	checkerKey?: string
	model?: string
	prompt?: string
	options?: unknown
	heuristicCriteria?: HeuristicCriterion[]
	heuristicPrompt?: string
	/** 자동 검수 가능 여부 — deterministic인데 checker 미등록이면 false (UI 배지용). */
	implemented: boolean
	/** string은 기존 CheckSession snapshot 조회 호환용이다. */
	evidence: CheckEvidence | string
	referenceAssets: CheckReferenceAsset[]
	messages?: Partial<Record<CheckStatus, string>>
}

/** 검수 화면에서 Check 배치를 표시하는 가이드라인 문서 단위다. */
export interface CheckSection {
	title: string
	slug: string
	groupTitle: string
	groupSlug: string
	chapterTitle: string
	chapterSlug: string
	chapterOrder: number
	topicTitle: string
	topicSlug: string
	topicOrder: number
	checks: RuntimeCheck[]
}
