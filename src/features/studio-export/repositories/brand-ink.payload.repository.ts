import config from '@payload-config'
import { getPayload } from 'payload'
import { FALLBACK_LOCALE, DEFAULT_LOCALE as LOCALE } from '@/lib/locale'
import type { CmykColor } from '../adapters/rgb-to-cmyk.sharp'
import { parseCmykNotation } from '../cmyk-notation'

/**
 * 브랜드 정본이 지정한 잉크값을 hex로 찾을 수 있게 모아 준다.
 *
 * 🔴 인쇄 PDF의 도형 색은 ICC 계산이 아니라 이 값을 쓴다. 계산값은 정본과 크게 어긋난다 —
 *    2026-09-09 실측: HD PROSPERITY GREEN 28%p, DARK GREY 41%p 차이. 특히 정본은 뉴트럴을
 *    K 위주로 짰는데 ICC는 CMY를 섞어, 계산값으로 찍으면 회색이 4판에 걸려 핀 어긋남에 색이 튄다.
 * 🔑 Payload 접근을 repository가 갖는 이유는 `docs/06`. service가 직접 조회하면 단위 테스트가
 *    Payload를 실제로 부팅한다.
 */
export async function listBrandInks(): Promise<Map<string, CmykColor>> {
	const payload = await getPayload({ config })
	const colors = await payload.find({
		collection: 'brand-colors',
		depth: 0,
		draft: false,
		fallbackLocale: FALLBACK_LOCALE,
		limit: 500,
		locale: LOCALE,
		select: { cmyk: true, hex: true, name: true },
	})

	const inks = new Map<string, CmykColor>()
	for (const color of colors.docs) {
		if (!color.cmyk) continue
		const ink = parseCmykNotation(color.cmyk)
		// 🔴 admin에서 사람이 고치는 자유 텍스트라 오타가 들어올 수 있다. 반쯤 읽지 않고 건너뛰면
		//    그 색만 ICC 계산으로 나가므로 인쇄가 멈추지는 않는다 — 대신 서버 로그에 남긴다.
		// ponytail: 로그가 유일한 신호다. 내보내기 화면에 띄우려면 `reportUnsupported`까지 배선해야
		//    하는데, 그건 경고 표면을 손대는 별개 작업이다.
		if (!ink) {
			console.warn(`brand-colors: CMYK 표기를 읽지 못했습니다 — ${color.name}: ${color.cmyk}`)
			continue
		}
		inks.set(color.hex.toLowerCase(), ink)
	}
	return inks
}
