import { toCheckResult } from '@/features/asset-check/checkers/check-result.adapter'
import { planChecks } from '@/features/asset-check/domain/check-plan'
import {
	type CheckSession,
	CheckSessionInputMismatchError,
	type CheckSessionInputSnapshot,
	CheckSessionNotFoundError,
	type CheckSessionSource,
	CheckSessionStateError,
	CheckSessionTerminalError,
} from '@/features/asset-check/domain/check-session'
import {
	evaluateAdvisory,
	evaluateHeuristic,
	type HeuristicObservation,
	measureObservationSchema,
	presenceObservationSchema,
} from '@/features/asset-check/domain/heuristic.evaluator'
import { needsReview } from '@/features/asset-check/domain/needs-review'
import type { RuntimeCheck } from '@/features/asset-check/domain/runtime-check'
import {
	findUnavailableAiReferenceCheckKeys,
	loadAiReferenceFiles,
} from '@/features/asset-check/repositories/ai-check.ai.repository'
import {
	completeRunningCheckSessionRecord,
	createCheckSessionRecord,
	getCheckSessionRecord,
	saveCheckSessionRecord,
} from '@/features/asset-check/repositories/check-session.payload.repository'
import { getRuntimeChecks } from '@/features/asset-check/services/get-check-ruleset.service'
import {
	runHeuristicCheck,
	runImmediateCheck,
} from '@/features/asset-check/services/run-check.service'
import { detectCheckImageMediaType } from '@/features/asset-check/utils/image-format'
import { type CheckScenario, getCheckScenario } from '@/features/quality-rule/check-scenario'
import { findPublishedCheckScenarios } from '@/features/quality-rule/repositories/check-scenario.payload.repository'
import type { AgentChatSession, User } from '@/payload-types'
import { recordCheckAiUsage } from './record-check-ai-usage'

interface StartCheckSessionInput {
	agentChatSessionId?: AgentChatSession['id']
	buffer: Buffer
	/**
	 * heuristic(AI) 판정을 후속 요청으로 미룰 조건. 생략하면 이 요청에서 전부 끝낸다.
	 * - 'always': 무조건 미룬다. 🔴 MCP는 LBS의 AI 키를 쓰지 않고 연결된 클라이언트 AI가
	 *   관측하므로 반드시 이 값이어야 한다(docs/features/review.md) — 미루지 않으면 서버 AI가
	 *   대신 판정해 관측 작업이 클라이언트에 반환되지 않는다.
	 * - 'when-showable': 즉시 판정이 하나라도 있을 때만 미룬다(화면).
	 */
	deferHeuristic?: 'always' | 'when-showable'
	imageName?: string
	scenario?: CheckScenario
	scenarioKey?: string
	source: CheckSessionSource
	user: User
}

interface CompleteCheckSessionAiCheckInput {
	buffer: Buffer
	checkSessionId: number
	user: User
}

export type ClientCheckObservations = Record<string, Record<string, HeuristicObservation>>

interface CompleteCheckSessionObservationsInput {
	advices?: Record<string, string>
	checkSessionId: number
	observations?: ClientCheckObservations
	user: User
}

async function snapshotInput(buffer: Buffer): Promise<CheckSessionInputSnapshot> {
	const mediaType = detectCheckImageMediaType(buffer)
	if (!mediaType) throw new CheckSessionInputMismatchError('Unsupported check image input.')
	const digest = await globalThis.crypto.subtle.digest('SHA-256', Uint8Array.from(buffer))

	return {
		sha256: Buffer.from(digest).toString('hex'),
		mediaType,
		byteLength: buffer.byteLength,
	}
}

/**
 * 검수 세션 시작 유스케이스 — 기본은 전체 판정을 저장하고, 화면 요청은 AI 룰을 후속 처리로 분리한다.
 * 상태 전이와 결과 병합은 CheckSession Aggregate가, 저장 I/O는 check-session repository가,
 * 룰 판정은 asset-check 기능의 run-check/get-check-rules service가 소유한다.
 */
export async function startCheckSession(input: StartCheckSessionInput) {
	const inputSnapshot = await snapshotInput(input.buffer)
	const scenario =
		input.scenario ??
		getCheckScenario(await findPublishedCheckScenarios(input.user), input.scenarioKey)
	const rulesetSnapshot = await getRuntimeChecks(scenario.checkKeys)
	const session = await createCheckSessionRecord({
		agentChatSessionId: input.agentChatSessionId,
		source: input.source,
		imageName: input.imageName,
		rulesetSnapshot,
		inputSnapshot,
		user: input.user,
	})

	try {
		const immediate = await runImmediateCheck(input.buffer, rulesetSnapshot)
		session.applyImmediateResults(immediate)
		// 후속 요청으로 미뤄서 얻는 값은 "먼저 보여줄 판정이 있다"는 것뿐이다. 즉시 판정이 0건이면
		// 화면은 어차피 AI가 끝날 때까지 빈 채로 기다리는데, 후속 요청은 원본 이미지를 한 번 더
		// 올린다(3MB대 × 2). 보여줄 것이 없으면 나누지 않고 이 요청에서 끝낸다.
		const defer =
			input.deferHeuristic === 'always' ||
			(input.deferHeuristic === 'when-showable' && Object.keys(immediate.results).length > 0)
		if (!defer && session.pendingCheckKeys.length > 0) {
			const aiCheck = await runHeuristicCheck(
				input.buffer,
				session.pendingCheckKeys,
				rulesetSnapshot,
			)
			session.applyAiResults(aiCheck)
			await recordCheckAiUsage(aiCheck.aiUsages, input.user, session.id)
		}
		await saveCheckSessionRecord(session, input.user)

		return {
			checkSessionId: session.id,
			results: session.results,
			pendingCheckKeys: session.pendingCheckKeys,
			rulesetSnapshot,
		}
	} catch (error) {
		await persistCheckSessionFailure(session, input.user, error)
		throw error
	}
}

/**
 * 검수 세션 AI 완료 유스케이스 — 세션에 저장된 pendingCheckKeys로 heuristic 룰을 실행하고 병합한다.
 * 같은 입력으로 이미 완료된 세션은 저장 결과를 반환하고, 실패 세션은 종결 오류로 처리한다.
 * 소유자 제한 조회와 상태 저장 외부 I/O는 check-session repository가 소유한다.
 */
export async function completeCheckSessionAiCheck(input: CompleteCheckSessionAiCheckInput) {
	const session = await getCheckSessionRecord(input.checkSessionId, input.user)
	if (!session) throw new CheckSessionNotFoundError('Check session not found.')
	session.assertInputMatches(await snapshotInput(input.buffer))
	if (session.isCompleted) {
		return { checkSessionId: session.id, results: session.results }
	}
	if (session.isFailed) {
		throw new CheckSessionTerminalError('Check session already failed.')
	}

	try {
		const aiCheck = await runHeuristicCheck(
			input.buffer,
			session.pendingCheckKeys,
			session.rulesetSnapshot,
		)
		session.applyAiResults(aiCheck)
		await recordCheckAiUsage(aiCheck.aiUsages, input.user, session.id)
		await saveCheckSessionRecord(session, input.user)

		return { checkSessionId: session.id, results: aiCheck.results }
	} catch (error) {
		await persistCheckSessionFailure(session, input.user, error)
		throw error
	}
}

/**
 * MCP 클라이언트 AI가 제출한 관측값으로 검수 세션을 완료한다.
 * 클라이언트는 관측만 소유하고, 최종 판정·상태 전이는 evaluator·Aggregate가 맡는다.
 * 레퍼런스 조회와 첫 완료 조건부 저장 외부 I/O는 각 repository가 맡는다.
 */
export async function completeCheckSessionObservations(
	input: CompleteCheckSessionObservationsInput,
) {
	const session = await getCheckSessionRecord(input.checkSessionId, input.user)
	if (!session) throw new CheckSessionNotFoundError('Check session not found.')
	if (session.isCompleted) {
		return { checkSessionId: session.id, results: session.results }
	}
	if (session.isFailed) {
		throw new CheckSessionTerminalError('Check session already failed.')
	}

	const checks = getSubmittedChecks(
		session.pendingCheckKeys,
		session.rulesetSnapshot,
		input.observations ?? {},
		input.advices ?? {},
	)
	const referenceFilesByKey = await loadAiReferenceFiles(checks)
	const unavailableReferenceCheckKeys = new Set(
		findUnavailableAiReferenceCheckKeys(checks, referenceFilesByKey),
	)
	// 실행 방식 판단은 planChecks 한 곳이 소유한다. 관측은 MCP 클라이언트가 제공하므로
	// 서버 model이 없는 heuristic(unrunnable plan)도 여기서는 evaluator로 그대로 판정한다.
	const results = Object.fromEntries(
		planChecks(checks).map((plan) => [
			plan.check.key,
			toCheckResult(
				unavailableReferenceCheckKeys.has(plan.check.key)
					? needsReview('reference_asset_unavailable')
					: plan.kind === 'ai-advisory' || plan.kind === 'manual-review'
						? evaluateAdvisory(input.advices?.[plan.check.key])
						: evaluateHeuristic(
								plan.check.heuristicCriteria ?? [],
								input.observations?.[plan.check.key],
							),
				plan.check,
				{ key: 'mcp-client', type: 'ai' },
			),
		]),
	)

	try {
		session.applyAiResults({ results })
		if (!(await completeRunningCheckSessionRecord(session, input.user))) {
			const storedSession = await getCheckSessionRecord(session.id, input.user)
			if (!storedSession) throw new CheckSessionNotFoundError('Check session not found.')
			if (storedSession.isCompleted) {
				return { checkSessionId: storedSession.id, results: storedSession.results }
			}
			if (storedSession.isFailed) {
				throw new CheckSessionTerminalError('Check session already failed.')
			}
			throw new CheckSessionStateError('Check session completion was not persisted.')
		}
		return { checkSessionId: session.id, results: session.results }
	} catch (error) {
		await persistCheckSessionFailure(session, input.user, error)
		throw error
	}
}

function getSubmittedChecks(
	pendingCheckKeys: string[],
	rulesetSnapshot: RuntimeCheck[] | undefined,
	observations: ClientCheckObservations,
	advices: Record<string, string>,
): RuntimeCheck[] {
	const byKey = new Map((rulesetSnapshot ?? []).map((check) => [check.key, check]))
	const checks = pendingCheckKeys.map((key) => byKey.get(key))
	if (checks.some((check) => !check)) {
		throw new Error('Client check submission does not match the saved ruleset.')
	}
	const submittedChecks = checks as RuntimeCheck[]
	assertExactKeys(
		Object.keys(observations),
		submittedChecks.filter((check) => check.executor !== 'manual').map((check) => check.key),
	)
	assertExactKeys(
		Object.keys(advices),
		submittedChecks.filter((check) => check.executor === 'manual').map((check) => check.key),
	)
	for (const check of submittedChecks) {
		if (check.executor === 'manual') continue
		assertExactKeys(
			Object.keys(observations[check.key] ?? {}),
			(check.heuristicCriteria ?? []).map((criterion) => criterion.id),
		)
		for (const criterion of check.heuristicCriteria ?? []) {
			const schema =
				criterion.kind === 'measure' ? measureObservationSchema : presenceObservationSchema
			if (!schema.safeParse(observations[check.key]?.[criterion.id]).success) {
				throw new Error(
					`Client check observation does not match criterion ${criterion.id}.`,
				)
			}
		}
	}
	return submittedChecks
}

function assertExactKeys(actual: string[], expected: string[]) {
	const sortedActual = [...actual].sort()
	const sortedExpected = [...expected].sort()
	if (
		sortedActual.length !== sortedExpected.length ||
		sortedActual.some((key, index) => key !== sortedExpected[index])
	) {
		throw new Error(
			`Client check submission keys do not match (expected: ${sortedExpected.join(', ') || '-'}).`,
		)
	}
}

async function persistCheckSessionFailure(session: CheckSession, user: User, error: unknown) {
	let runningSession: CheckSession | null = session

	// 완료 상태 저장이 실패했다면 DB의 실제 상태를 다시 읽는다. 첫 update가 반영됐다면
	// completed를 보존하고, 반영되지 않아 running인 경우에만 failed로 종결한다.
	if (runningSession.status !== 'running') {
		try {
			runningSession = await getCheckSessionRecord(runningSession.id, user)
		} catch (readError) {
			attachPersistenceCause(error, readError)
			return
		}
	}
	if (runningSession?.status !== 'running') return

	runningSession.fail(error instanceof Error ? error.message : 'Check failed.')
	try {
		await saveCheckSessionRecord(runningSession, user)
	} catch (saveError) {
		attachPersistenceCause(error, saveError)
	}
}

function attachPersistenceCause(error: unknown, persistenceError: unknown) {
	if (!(error instanceof Error) || !Object.isExtensible(error)) return
	error.cause =
		error.cause === undefined
			? persistenceError
			: new AggregateError(
					[error.cause, persistenceError],
					'Check session failure persistence failed.',
				)
}
