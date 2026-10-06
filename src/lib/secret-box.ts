import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { env } from '@/env'

/**
 * DB에 저장해 두는 외부 서비스 자격증명(사용자의 Figma 토큰 등)을 암호화한다. AES-256-GCM.
 *
 * 🔑 키는 `PAYLOAD_SECRET`에서 파생한다. 그래서 다른 secret을 쓰는 DB 사본(로컬 복사·덤프)에서는
 *    풀리지 않는다 — 사본이 퍼져도 열쇠는 같이 퍼지지 않는다. 풀리지 않으면 null이고, 호출자는 등록 안 된 것으로 본다.
 */
const secretKey = () => createHash('sha256').update(`secret-box:${env.PAYLOAD_SECRET}`).digest()

export function sealSecret(plain: string): string {
	const iv = randomBytes(12)
	const cipher = createCipheriv('aes-256-gcm', secretKey(), iv)
	const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
	return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.')
}

export function openSecret(sealed: string): string | null {
	const [iv, tag, data] = sealed.split('.').map((part) => Buffer.from(part, 'base64url'))
	if (!iv || !tag || !data) return null
	try {
		const decipher = createDecipheriv('aes-256-gcm', secretKey(), iv)
		decipher.setAuthTag(tag)
		return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
	} catch {
		return null
	}
}
