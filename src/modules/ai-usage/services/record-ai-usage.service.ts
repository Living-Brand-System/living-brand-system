import type { AiUsageRecord } from '../ai-usage'
import { createAiUsageEvent } from '../repositories/ai-usage.payload.repository'

/**
 * AI 호출 1건의 토큰 사용량을 기록한다 — 이미지 생성·검수·채팅이 모델을 부른 뒤 이것을 부른다.
 * ai-usage 모듈 밖에서 사용량을 남기는 유일한 입구다(경계 규칙 R1). 「실패해도 던지지 않는다」는
 * 정책은 repository가 갖는다 — 로그를 남기려면 payload가 필요한데 그것을 얻는 단계부터 실패할 수 있어서다.
 */
export function recordAiUsage(record: AiUsageRecord): Promise<void> {
	return createAiUsageEvent(record)
}
