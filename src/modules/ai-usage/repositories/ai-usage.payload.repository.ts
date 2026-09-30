import config from '@payload-config'
import { type BasePayload, getPayload } from 'payload'
import { type AiUsageRecord, hasAnyTokenCount } from '../ai-usage'

/**
 * AI 호출 1건의 토큰 사용량을 기록한다.
 *
 * 🔴 실패해도 절대 던지지 않는다. 이 기록은 사용자가 요청한 작업의 결과물이 아니라 그 곁의 계량이라,
 *    여기서 던지면 이미 성공한 이미지 생성·검수가 통째로 실패한 것처럼 보인다. 대신 로그를 남긴다.
 */
export async function recordAiUsage({ source, ...input }: AiUsageRecord): Promise<void> {
	if (!hasAnyTokenCount(input)) return
	// payload 획득부터 try 안에 둔다 — 그것이 실패해도 호출자가 죽으면 안 된다.
	// 로깅에도 payload가 필요하므로 catch가 쓸 수 있게 밖에 잡아 둔다.
	let payload: BasePayload | undefined
	try {
		payload = await getPayload({ config })
		await payload.create({
			collection: 'ai-usage-events',
			data: {
				createdBy: input.createdBy,
				feature: input.feature,
				model: input.model,
				inputTokens: input.inputTokens ?? null,
				outputTokens: input.outputTokens ?? null,
				totalTokens: input.totalTokens ?? null,
				cacheReadInputTokens: input.cacheReadInputTokens ?? null,
				cacheWriteInputTokens: input.cacheWriteInputTokens ?? null,
				reasoningTokens: input.reasoningTokens ?? null,
				...(source ? { source } : {}),
			},
			// 사용량은 서버 use case만 남긴다 — 컬렉션 create는 닫혀 있다.
			overrideAccess: true,
		})
	} catch (error) {
		payload?.logger.error(
			{ err: error, feature: input.feature, model: input.model },
			'ai-usage.record-failed',
		)
	}
}
