import type { AvailableScenarioCheck } from './list-available-scenario-checks.service'

/**
 * 검수 프로파일 폼이 고를 수 있는 Check 목록 — `GET /api/check-scenarios/available-checks` 호출의 계약을
 * 소유한다. 실패는 던져서 필드가 안내 문구를 그리게 한다.
 */
export async function fetchAvailableScenarioChecks(
	signal: AbortSignal,
): Promise<AvailableScenarioCheck[]> {
	const response = await fetch('/api/check-scenarios/available-checks', { signal })
	if (!response.ok) throw new Error('Check 목록을 불러오지 못했습니다.')
	const body = (await response.json()) as { docs?: AvailableScenarioCheck[] }
	return body.docs ?? []
}
