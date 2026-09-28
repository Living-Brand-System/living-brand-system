import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { isPayloadUser } from '@/lib/auth'
import { authenticateRequest } from '@/lib/request-auth'
import { routes, safeRedirectPath } from '@/lib/routes'

// 렌더링: 매 요청. 이미 로그인했는지를 세션으로 보고 돌려보내므로 캐시하지 않는다(docs/05).
export const dynamic = 'force-dynamic'

/**
 * 앱 로그인 화면 — Payload Admin 대신 여기서 로그인한다.
 *
 * 🔴 이 화면이 존재하는 이유는 디자인이 아니라 **노출**이다. 로그인 문이 `/admin/login`이면
 *    CMS를 쓰지 않는 사용자도 CMS의 존재를 알게 된다(docs/07 #14).
 */
export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
	const redirectParam = (await searchParams).redirect
	// 🔴 주소창 값이므로 그대로 믿지 않는다 — 내부 경로만 통과시킨다.
	const redirectTo = safeRedirectPath(
		Array.isArray(redirectParam) ? redirectParam[0] : redirectParam,
		routes.account,
	)

	// 🔴 `user`가 아니라 `isPayloadUser`를 본다. MCP API 키 세션은 user가 있지만 사람 계정이
	//    아니라서 `/account`·`/studio/usage`가 여기로 되돌려 보내는데, 그때 truthy만 보면
	//    두 화면과 이 화면이 서로를 가리켜 **무한 리다이렉트**가 된다.
	const { user } = await authenticateRequest()
	if (isPayloadUser(user)) redirect(redirectTo)

	// 앱 셸이 헤더를 본문 위에 겹치므로 그 높이만큼 비운다(section-layout과 같은 값).
	return (
		<main className="grid h-full place-items-center overflow-y-auto p-4 pt-[50px] md:p-6 xl:pt-(--global-header-height)">
			{/* 폭은 화면 조합이 소유한다(docs/10 §4). 입력 둘짜리 폼이라 MCP 카드보다 좁다. */}
			<div className="w-full max-w-sm">
				<LoginForm redirectTo={redirectTo} />
			</div>
		</main>
	)
}
