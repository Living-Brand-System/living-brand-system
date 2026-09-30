import type { Payload } from 'payload'
import { openSecret, sealSecret } from '@/lib/secret-box'

/**
 * 사용자별 Figma 개인 API 토큰의 저장소. `users.figmaToken`은 필드 access로 전부 막혀 있으므로
 * 여기서만 overrideAccess로 읽고 쓴다. 원문은 이 파일 밖으로 나갈 때 Figma 요청 헤더로만 간다.
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
