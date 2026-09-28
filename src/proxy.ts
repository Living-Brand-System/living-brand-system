import payloadConfig from '@payload-config'
import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import { isManager } from '@/lib/auth'

/**
 * worker에게 Payload Admin은 **존재하지 않아야 한다**(2026-09-28 결정).
 *
 * `Users.access.admin`이 이미 진입 자체는 막지만, Payload는 거부를 「권한이 없습니다」 화면으로
 * 알려 준다 — 막히긴 해도 CMS가 있다는 사실이 드러난다. 여기서 404로 돌려 주소를 없는 것으로 만든다.
 * 🔴 권한의 1차 경계는 여전히 `Users.access.admin`이다. 이 파일은 노출을 덮는 층이다.
 */
export async function proxy(request: NextRequest) {
	const payload = await getPayload({ config: payloadConfig })
	const { user } = await payload.auth({ headers: request.headers })
	// 앱의 일반 404 화면을 그대로 낸다 — 빈 응답이면 「막혔다」로 읽힌다.
	if (!isManager(user)) return NextResponse.rewrite(new URL('/admin-not-found', request.url))
}

export const config = {
	matcher: ['/admin', '/admin/:path*'],
}
