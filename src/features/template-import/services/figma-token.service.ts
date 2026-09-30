import type { Payload } from 'payload'
import {
	deleteFigmaToken,
	findFigmaToken,
	saveFigmaToken,
} from '@/features/template-import/repositories/figma-token.payload.repository'
import type { User } from '@/payload-types'

/**
 * 계정 화면의 Figma 토큰 등록·삭제·상태. 토큰은 본인 것만 다룬다 — 남의 토큰을 보거나 넣는 경로는 없다.
 * 「연결됨」은 토큰이 저장돼 있다는 뜻이다. 유효한지는 가져오기 때 Figma가 답한다.
 */
export async function hasFigmaToken(payload: Payload, user: User): Promise<boolean> {
	return (await findFigmaToken(payload, user.id)) !== null
}

export function registerFigmaToken(payload: Payload, user: User, token: string) {
	return saveFigmaToken(payload, user.id, token)
}

export function removeFigmaToken(payload: Payload, user: User) {
	return deleteFigmaToken(payload, user.id)
}
