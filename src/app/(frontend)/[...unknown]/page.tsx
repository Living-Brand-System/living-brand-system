import { notFound } from 'next/navigation'

// 렌더링: 정적. 요청을 하나도 읽지 않고 언제나 404다.
export const dynamic = 'force-static'

/**
 * 어느 라우트에도 안 맞는 주소를 앱의 404(`not-found.tsx`)로 받는다.
 *
 * 🔴 루트 layout이 (frontend)·(payload) 둘이라 이게 없으면 Next 기본 404가 뜬다 — 그러면
 *    worker가 친 `/admin`(앱 404, `admin-not-found`)과 아무 주소의 404가 달라 보여
 *    「`/admin`에는 뭔가 있다」가 드러난다. catch-all은 우선순위가 가장 낮아 기존 라우트를 가리지 않는다.
 */
export default function UnknownRoutePage() {
	notFound()
}
