import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * 강조에 쓰는 브랜드 색 이름.
 *
 * 🔑 CI 심볼의 **중간초록**이다(`ci-lockup`의 `SYMBOL_CONTOURS` 두 번째 — 큰 삼각형을 칠하는 주색).
 *    심볼은 밝은·중간·어두운 초록 3색인데, 선 하나로 쓸 것은 면적이 가장 넓은 그 색이다.
 *    「이 브랜드의 색」으로 읽히는 자리라 임의 색을 열지 않고 하나로 못 박는다.
 * 🔴 hex를 코드에 박지 않는다 — 브랜드 색이 바뀌면 컬렉션만 고치면 되게 이름으로 찾는다
 *    (`docs/09` §4의 색-데이터 예외이고, `ci-lockup` 위젯이 같은 규칙을 쓴다).
 */
const HIGHLIGHT_COLOR_NAME = 'HD HERITAGE GREEN'

/** DB에서 온 문자열이 그대로 CSS 선언에 들어가는 자리다 — hex 형태만 통과시킨다. */
function safeHex(value: unknown): string | null {
	return typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : null
}

/**
 * 캔버스 강조색을 브랜드 컬렉션에서 읽는다. 못 찾으면 `null`이고 화면이 폴백한다.
 *
 * 🔴 이 Payload 접근이 서비스 파일 안에 있었다(2026-09-02까지). 그러면 호출자가 mock할 수 없어
 *    단위 테스트가 Payload를 실제로 부팅했고, 빈 DB에서는 스키마 생성 비용까지 그 테스트 하나가
 *    뒤집어써 CI가 타임아웃으로 실패했다. Payload 접근은 repository가 갖는다(`docs/06`).
 */
export async function getTemplateHighlightColor(): Promise<string | null> {
	try {
		const payload = await getPayload({ config })
		const { docs } = await payload.find({
			collection: 'brand-colors',
			where: { name: { equals: HIGHLIGHT_COLOR_NAME } },
			depth: 0,
			limit: 1,
			select: { hex: true },
			overrideAccess: true,
		})
		return safeHex(docs[0]?.hex)
	} catch {
		return null
	}
}
