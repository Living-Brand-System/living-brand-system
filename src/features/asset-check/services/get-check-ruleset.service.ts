import { cache } from 'react'
import { hasChecker } from '@/features/asset-check/checkers/registry'
import type { HeuristicCriterion } from '@/features/asset-check/checkers/types'
import type { CheckSection, RuntimeCheck } from '@/features/asset-check/domain/runtime-check'
import {
	type CheckRulesetSourceDocument,
	getCheckSourceDocuments,
} from '@/features/asset-check/repositories/check-ruleset.payload.repository'
import { toRuntimeCheckMessages } from '@/features/asset-check/utils/check-messages'
import type { GuidelineCheckSource } from '@/features/guideline/checks/collect-guideline-check-sources'

/**
 * 검수 화면용 Check 뷰모델을 published 통합 문서와 내부 Block에서 조립한다.
 * Payload 조회는 check-ruleset repository가 소유한다.
 */
export const getCheckRuleset = cache(async (): Promise<CheckSection[]> => {
	const { documents } = await getCheckSourceDocuments()
	// 🔴 배치 단위는 문서가 아니라 **섹션**이다. 2026-08-26 이관으로 섹션이 문서에서 블록이 되면서
	//    한 토픽의 Check가 전부 한 덩어리로 뭉쳤고, 검수 화면의 딥링크가 토픽까지만 갔다.
	//    근거가 지목하는 섹션(`source.section`)으로 다시 가른다. 섹션이 없는 것은 문서 자신의 rule이다.
	const items = documents.flatMap((document) =>
		groupChecksBySection(document.checks).map(({ section, checks }) => ({
			documentOrder: section?.order ?? -1,
			item: {
				title: section?.title ?? document.title,
				// 🔴 섹션의 slug 자리에 앵커를 넣는다 — `toGuidelineHref`가 slug와 topicSlug가
				//    다를 때 `#앵커`를 붙이므로, 문서 자신의 rule은 앵커 없이 토픽으로 남는다.
				slug: section?.anchor ?? document.slug,
				...toCheckPlacement(document),
				checks: checks.map(toRuntimeCheck),
			},
		})),
	)

	return items
		.filter(({ item }) => item.checks.length > 0)
		.sort(
			(a, b) =>
				a.item.chapterOrder - b.item.chapterOrder ||
				a.item.topicOrder - b.item.topicOrder ||
				a.documentOrder - b.documentOrder,
		)
		.map(({ item }) => item)
})

/**
 * Check를 근거가 놓인 섹션별로 가른다. 문서 자신의 rule은 섹션 없는 한 덩어리로 남는다.
 * 순서는 첫 등장 순 — `collectGuidelineCheckSources`가 문서 본문 순서로 수집한다.
 */
function groupChecksBySection(
	checks: GuidelineCheckSource[],
): { section: GuidelineCheckSource['source']['section']; checks: GuidelineCheckSource[] }[] {
	const groups = new Map<
		string,
		{ section: GuidelineCheckSource['source']['section']; checks: GuidelineCheckSource[] }
	>()

	for (const check of checks) {
		const key = check.source.section?.anchor ?? ''
		const group = groups.get(key) ?? { section: check.source.section, checks: [] }
		group.checks.push(check)
		groups.set(key, group)
	}

	return [...groups.values()]
}

/**
 * 검수 실행용 Check snapshot을 checkKeys 순서로 반환하며 누락·미구현 실행 구성을 거부한다.
 * published source 조회는 check-ruleset repository가 소유한다.
 */
export async function getRuntimeChecks(checkKeys?: string[]): Promise<RuntimeCheck[]> {
	const checks = uniqueChecks((await getCheckRuleset()).flatMap((section) => section.checks))
	const requestedKeys = checkKeys ?? checks.map((check) => check.key)
	const byKey = new Map(checks.map((check) => [check.key, check]))
	assertRunnableCheckKeys(requestedKeys, byKey)

	return requestedKeys.map((key) => byKey.get(key) as RuntimeCheck)
}

function assertRunnableCheckKeys(requestedKeys: string[], checks: Map<string, RuntimeCheck>): void {
	if (requestedKeys.length === 0) {
		throw new Error('Check 실행 구성 오류: 실행할 Check key가 없습니다.')
	}

	const duplicateKeys = requestedKeys.filter((key, index) => requestedKeys.indexOf(key) !== index)
	const missingKeys = requestedKeys.filter((key) => !checks.has(key))
	const unimplementedKeys = requestedKeys.filter((key) => checks.get(key)?.implemented === false)
	const problems = [
		...formatKeyProblem('중복', duplicateKeys),
		...formatKeyProblem('누락', missingKeys),
		...formatKeyProblem('미구현', unimplementedKeys),
	]
	if (problems.length > 0) {
		throw new Error(`Check 실행 구성 오류: ${problems.join('; ')}`)
	}
}

function formatKeyProblem(label: string, keys: string[]): string[] {
	return keys.length > 0 ? [`${label} [${[...new Set(keys)].join(', ')}]`] : []
}

function toRuntimeCheck({
	rule,
	evidence,
	referenceAssets,
	source,
}: GuidelineCheckSource): RuntimeCheck {
	const checker = typeof rule.checker === 'object' && rule.checker !== null ? rule.checker : null
	if (!checker) throw new Error(`RuleChecker가 연결되지 않은 Check입니다: ${rule.key}`)
	const checkerKey = checker.checkerKey ?? undefined
	const model = checker.model ?? undefined
	const prompt = checker.prompt?.trim() || undefined
	const options = checker.executor === 'deterministic' ? (rule.options ?? undefined) : undefined
	const heuristicCriteria =
		checker.executor === 'heuristic'
			? (rule.criteria ?? []).flatMap((criterion): HeuristicCriterion[] => {
					const question = criterion.question?.trim()
					if (!criterion.id || !question) return []
					if (criterion.kind === 'measure') {
						return criterion.operator && typeof criterion.expectedValue === 'number'
							? [
									{
										id: criterion.id,
										question,
										kind: 'measure',
										operator: criterion.operator,
										expected: criterion.expectedValue,
										max: criterion.max ?? undefined,
										unit: criterion.unit?.trim() || undefined,
									},
								]
							: []
					}
					return criterion.expected
						? [{ id: criterion.id, question, expected: criterion.expected }]
						: []
				})
			: undefined
	const heuristicPrompt =
		checker.executor === 'heuristic' && rule.heuristicPrompt?.trim()
			? rule.heuristicPrompt.trim()
			: undefined
	const implemented =
		checker.executor === 'deterministic'
			? Boolean(checkerKey && hasChecker(checkerKey, options))
			: checker.executor === 'heuristic'
				? Boolean(model)
				: true

	return {
		key: rule.key,
		title: rule.title,
		titleKo: rule.titleKo?.trim() || undefined,
		tier: rule.tier,
		source,
		checker: {
			key: checker.key,
			type: checker.executor,
			implementationKey: checker.executor === 'deterministic' ? checkerKey : undefined,
		},
		executor: checker.executor,
		checkerKey,
		model,
		prompt,
		options,
		heuristicCriteria,
		heuristicPrompt,
		implemented,
		evidence,
		referenceAssets: referenceAssets.flatMap(({ asset, role }) =>
			asset.url && asset.mimeType
				? [{ name: asset.name, url: asset.url, mimeType: asset.mimeType, role }]
				: [],
		),
		messages:
			checker.executor === 'heuristic' ? undefined : toRuntimeCheckMessages(rule.messages),
	}
}

function uniqueChecks(checks: RuntimeCheck[]): RuntimeCheck[] {
	const byKey = new Map<string, RuntimeCheck[]>()
	for (const check of checks) {
		const placements = byKey.get(check.key)
		if (placements) placements.push(check)
		else byKey.set(check.key, [check])
	}
	return [...byKey.values()].map(mergeCheckPlacements)
}

// 같은 Rule이 여러 문서·블록에 배치되면 정의는 공유되므로 근거와 참조 자산만 합친다.
function mergeCheckPlacements(placements: RuntimeCheck[]): RuntimeCheck {
	const [first] = placements
	if (placements.length === 1) return first

	const evidences = placements
		.map(({ evidence }) => evidence)
		.filter(
			(evidence): evidence is Exclude<typeof evidence, string> =>
				typeof evidence !== 'string',
		)
	const descriptions = [
		...new Set(
			evidences.flatMap((evidence) =>
				evidence.type === 'document' && evidence.description ? [evidence.description] : [],
			),
		),
	]
	return {
		...first,
		evidence: {
			type: 'document',
			description: descriptions.length > 0 ? descriptions.join('\n') : undefined,
			blocks: evidences.flatMap((evidence) =>
				evidence.type === 'document' ? evidence.blocks : [evidence],
			),
		},
		referenceAssets: [
			...new Map(
				placements
					.flatMap((placement) => placement.referenceAssets)
					.map((asset) => [`${asset.url}:${asset.role}`, asset] as const),
			).values(),
		],
	}
}

// 🔴 문서 자신이 토픽이다(2026-08-26). 계층이 사라져 breadcrumb으로 조상을 되짚을 필요가 없다.
function toCheckPlacement(document: CheckRulesetSourceDocument) {
	const chapter = document.chapter

	return {
		groupTitle: document.title,
		groupSlug: document.slug,
		chapterTitle: chapter?.title ?? document.title,
		chapterSlug: chapter?.slug ?? document.slug,
		chapterOrder: chapter?.displayOrder ?? -1,
		topicTitle: document.title,
		topicSlug: document.slug,
		topicOrder: document.displayOrder,
	}
}
