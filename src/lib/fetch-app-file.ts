import { env } from '@/env'

/**
 * 업로드 파일 URL(이 앱의 상대 경로 또는 외부 절대 URL)의 바이트를 서버에서 읽는다. 실패하면 null.
 * 저장소가 로컬 디스크든 Blob이든 파일 URL로 읽으므로 호출자는 저장 방식을 모른다.
 */
export async function fetchAppFile(url: string): Promise<Buffer | null> {
	// staging은 Vercel 로그인으로 보호돼 자기 자신에게 보내는 요청도 막힌다. 우회 비밀값은
	// 상대 경로(= 이 앱)로 가는 요청에만 싣는다 — 외부 절대 URL에 실으면 제3자에게 샌다.
	const bypass = isAbsoluteUrl(url) ? undefined : env.VERCEL_AUTOMATION_BYPASS_SECRET
	const response = await fetch(toAbsoluteUrl(url), {
		headers: bypass ? { 'x-vercel-protection-bypass': bypass } : undefined,
	})
	if (!response.ok) return null
	return Buffer.from(await response.arrayBuffer())
}

const isAbsoluteUrl = (url: string) => /^https?:\/\//.test(url)

function toAbsoluteUrl(url: string) {
	if (isAbsoluteUrl(url)) return url
	const origin =
		env.NEXT_PUBLIC_SITE_URL ||
		(env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'http://localhost:3000')
	return new URL(url, origin).toString()
}
