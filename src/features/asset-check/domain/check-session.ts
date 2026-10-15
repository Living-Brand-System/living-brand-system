import type { AiUsage, CheckResult } from '@/features/asset-check/checkers/types'
import type { RuntimeCheck } from '@/features/asset-check/domain/runtime-check'
import {
	CHECK_IMAGE_MEDIA_TYPES,
	type CheckImageMediaType,
} from '@/features/asset-check/utils/image-format'

/** 검수 세션 상태·출처·입력 형식 — CheckSessions 컬렉션 select와 도메인 타입이 이 목록을 읽는다. */
export const CHECK_SESSION_STATUS_OPTIONS = [
	{ label: 'Running', value: 'running' },
	{ label: 'Completed', value: 'completed' },
	{ label: 'Failed', value: 'failed' },
] as const
export type CheckSessionStatus = (typeof CHECK_SESSION_STATUS_OPTIONS)[number]['value']

export const CHECK_SESSION_SOURCE_OPTIONS = [
	{ label: 'MCP Call', value: 'mcp-call' },
	{ label: 'Review Page', value: 'review-page' },
	{ label: 'Chat', value: 'chat' },
] as const
export type CheckSessionSource = (typeof CHECK_SESSION_SOURCE_OPTIONS)[number]['value']

const MEDIA_TYPE_LABEL: Record<CheckImageMediaType, string> = {
	'image/jpeg': 'JPEG',
	'image/png': 'PNG',
	'image/webp': 'WebP',
}
export const CHECK_IMAGE_MEDIA_TYPE_OPTIONS = CHECK_IMAGE_MEDIA_TYPES.map((value) => ({
	label: MEDIA_TYPE_LABEL[value],
	value,
}))

/** 종결(completed/failed)된 세션에 전이를 시도했을 때의 방어선. 정상 경로에서는 나오지 않는다. */
export class CheckSessionStateError extends Error {}

/** failed 세션에 AI 후속 검수를 요청했을 때. API route가 409로 변환한다. */
export class CheckSessionTerminalError extends Error {}

/** 요청한 사용자가 소유한 CheckSession을 찾지 못했을 때. */
export class CheckSessionNotFoundError extends Error {}

/** AI 후속 요청의 이미지가 세션 시작 시점의 입력과 다를 때. */
export class CheckSessionInputMismatchError extends Error {}

export interface CheckSessionInputSnapshot {
	sha256: string
	mediaType: CheckImageMediaType
	byteLength: number
}

export interface CheckSessionUpdateData {
	status: CheckSessionStatus
	results: Record<string, CheckResult>
	pendingCheckKeys: string[]
	aiUsage?: AiUsage
	errorMessage?: string
	completedAt?: string
}

export interface CheckSessionSnapshot {
	id: number
	status: CheckSessionStatus
	results: Record<string, CheckResult>
	pendingCheckKeys: string[]
	rulesetSnapshot?: RuntimeCheck[]
	inputSnapshot?: CheckSessionInputSnapshot
	aiUsage?: AiUsage
	errorMessage?: string
	completedAt?: string
}

/**
 * 검수 세션 Aggregate — running → completed/failed 전이와 결과 병합 규칙을 소유한다.
 * pending이 비면 스스로 완료한다. ruleset 모든 key의 결과 보장은 CheckPlan 전수 분류가 맡는다.
 * Payload 레코드와의 변환은 check-session repository만 수행한다.
 */
export class CheckSession {
	private constructor(
		readonly id: number,
		private _status: CheckSessionStatus,
		private _results: Record<string, CheckResult>,
		private _pendingCheckKeys: string[],
		readonly rulesetSnapshot: RuntimeCheck[] | undefined,
		private readonly inputSnapshot: CheckSessionInputSnapshot | undefined,
		private _aiUsage: AiUsage | undefined,
		private _errorMessage: string | undefined,
		private _completedAt: string | undefined,
	) {}

	static restore(snapshot: CheckSessionSnapshot): CheckSession {
		return new CheckSession(
			snapshot.id,
			snapshot.status,
			{ ...snapshot.results },
			[...snapshot.pendingCheckKeys],
			snapshot.rulesetSnapshot,
			snapshot.inputSnapshot,
			snapshot.aiUsage,
			snapshot.errorMessage,
			snapshot.completedAt,
		)
	}

	get status() {
		return this._status
	}

	get results(): Record<string, CheckResult> {
		return this._results
	}

	get pendingCheckKeys(): string[] {
		return [...this._pendingCheckKeys]
	}

	get isCompleted() {
		return this._status === 'completed'
	}

	get isFailed() {
		return this._status === 'failed'
	}

	/** 세션에 고정된 입력 지문과 후속 요청의 실제 바이트가 같은지 검증한다. */
	assertInputMatches(actual: CheckSessionInputSnapshot): void {
		if (
			!this.inputSnapshot ||
			this.inputSnapshot.sha256 !== actual.sha256 ||
			this.inputSnapshot.mediaType !== actual.mediaType ||
			this.inputSnapshot.byteLength !== actual.byteLength
		) {
			throw new CheckSessionInputMismatchError('Check session input does not match.')
		}
	}

	/** 즉시(deterministic/manual) 판정 결과와 남은 AI Check 목록을 반영한다. */
	applyImmediateResults(input: {
		results: Record<string, CheckResult>
		pendingCheckKeys: string[]
	}): void {
		this.assertRunning('applyImmediateResults')
		this._results = { ...this._results, ...input.results }
		this._pendingCheckKeys = [...input.pendingCheckKeys]
		this.completeIfDone()
	}

	/** AI 판정 결과를 병합하고 판정된 키를 pending에서 제거한다. */
	applyAiResults(input: { results: Record<string, CheckResult>; aiUsage?: AiUsage }): void {
		this.assertRunning('applyAiResults')
		this._results = { ...this._results, ...input.results }
		const applied = new Set(Object.keys(input.results))
		this._pendingCheckKeys = this._pendingCheckKeys.filter((key) => !applied.has(key))
		if (input.aiUsage) this._aiUsage = input.aiUsage
		this.completeIfDone()
	}

	fail(errorMessage: string): void {
		this.assertRunning('fail')
		this._status = 'failed'
		this._errorMessage = errorMessage
		this._completedAt = new Date().toISOString()
	}

	/** Repository 전용 — 갱신 대상 필드만 뽑는다. */
	toUpdateData(): CheckSessionUpdateData {
		return {
			status: this._status,
			results: this._results,
			pendingCheckKeys: this._pendingCheckKeys,
			aiUsage: this._aiUsage,
			errorMessage: this._errorMessage,
			completedAt: this._completedAt,
		}
	}

	// 결과 전수 보장은 CheckPlan 전수 분류(planChecks)와 run-check 실행 경로가 소유한다.
	private completeIfDone(): void {
		if (this._pendingCheckKeys.length > 0) return
		this._status = 'completed'
		this._completedAt = new Date().toISOString()
	}

	private assertRunning(action: string): void {
		if (this._status !== 'running') {
			throw new CheckSessionStateError(`${action}: session is ${this._status}, not running`)
		}
	}
}
