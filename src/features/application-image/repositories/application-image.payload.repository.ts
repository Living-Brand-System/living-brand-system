import config from '@payload-config'
import { getPayload } from 'payload'
import type { User } from '@/payload-types'

/**
 * 서버가 만든 이미지(스튜디오 미리보기 캡처 등)를 바로 공개 상태의 Application Image로 저장한다.
 * 🔑 새 행을 만든다 — 기존 행의 파일을 덮으면 URL이 그대로라 브라우저가 옛 이미지를 계속 보여 준다.
 */
export async function createPublishedApplicationImage(input: {
	alt: string
	data: Buffer
	filename: string
	mimeType: string
	name: string
	user: User
}): Promise<{ id: number }> {
	const payload = await getPayload({ config })
	const created = await payload.create({
		collection: 'application-images',
		data: { name: input.name, alt: input.alt, _status: 'published' },
		file: {
			data: input.data,
			mimetype: input.mimeType,
			name: input.filename,
			size: input.data.byteLength,
		},
		overrideAccess: false,
		user: input.user,
	})
	return { id: created.id }
}
