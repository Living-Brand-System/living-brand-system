import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { openSecret, sealSecret } from '@/lib/secret-box'
import type { User } from '@/payload-types'

/**
 * 계정 문서(`users`)의 기능별 설정 필드 저장소 — `users`의 소유자는 auth다(docs/06 §2 R3).
 * 한도(`tokenLimits`)와 Figma 토큰(`figmaToken`)은 본인에게도 숨겨진 필드라 전부 overrideAccess로 읽고 쓴다.
 * 누구의 것을 읽을지는 호출부(서비스)가 요청자 id로 정한다.
 */

/** 계정의 AI 토큰 한도 설정. 비어 있으면 전역 기본값을 따른다(계산은 ai-usage가 한다). */
export async function findUserTokenLimits(userId: number): Promise<User['tokenLimits']> {
	const payload = await getPayload({ config })
	const user = await payload.findByID({
		collection: 'users',
		id: userId,
		depth: 0,
		overrideAccess: true,
		select: { tokenLimits: true },
	})
	return user.tokenLimits
}

/**
 * Figma 개인 API 토큰. 원문은 이 파일 밖으로 나갈 때 Figma 요청 헤더로만 간다(docs/07).
 * `payload`를 받는 이유는 호출 맥락(라우트·import 서비스)이 이미 쥔 인스턴스를 그대로 쓰기 위해서다.
 */

/** 저장된 토큰을 푼다. 없거나 이 환경의 secret으로 풀리지 않으면 null이다. */
export async function findFigmaToken(payload: Payload, userId: number): Promise<string | null> {
	const user = await payload.findByID({
		collection: 'users',
		id: userId,
		depth: 0,
		overrideAccess: true,
		select: { figmaToken: true },
	})
	return user.figmaToken ? openSecret(user.figmaToken) : null
}

export async function saveFigmaToken(payload: Payload, userId: number, token: string) {
	await payload.update({
		collection: 'users',
		id: userId,
		overrideAccess: true,
		data: { figmaToken: sealSecret(token) },
	})
}

export async function deleteFigmaToken(payload: Payload, userId: number) {
	await payload.update({
		collection: 'users',
		id: userId,
		overrideAccess: true,
		data: { figmaToken: null },
	})
}
