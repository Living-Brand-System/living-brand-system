import { redirect } from 'next/navigation'

// 렌더링: 매 요청. 리다이렉트만 하므로 조회도 캐시도 없다.
// 🔴 방식을 선언으로 못박는다 — 추론에 맡기면 프로덕션에서만 드러나는 차이가 생긴다
//    (docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

/**
 * 챕터는 자기 화면을 갖지 않는다(2026-08-26). 챕터가 분류일 뿐이고, 그 화면이 그리던 것
 * — 제목과 토픽 카드 — 을 `/guideline` 인덱스가 이미 전 챕터에 대해 그리고 있었다.
 *
 * 🔴 그래도 이 조각은 모든 토픽 URL 안에 남아 있어 사람이 주소창에서 잘라 들어온다.
 *    404로 두면 막다른 길이므로 인덱스로 보낸다.
 */
export default async function GuidelineChapterPage() {
	redirect('/guideline')
}
