import { notFound } from 'next/navigation'

// 렌더링: 정적. 요청을 하나도 읽지 않고 언제나 404다 — 게이트는 `proxy.ts`가 이미 지났다.
export const dynamic = 'force-static'

/**
 * `proxy.ts`가 manager가 아닌 사용자의 `/admin` 요청을 여기로 rewrite한다 — 주소는 `/admin`인 채로
 * 앱의 404가 나온다. worker에게 Payload Admin은 **존재하지 않아야 하기** 때문이다(docs/07 #14).
 *
 * 🔴 권한의 1차 경계는 `Users.access.admin`이다. 이 경로는 노출을 덮는 층이라 아무것도 읽지 않는다.
 */
export default function AdminNotFoundPage() {
	notFound()
}
