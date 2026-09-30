/**
 * 가이드라인 B.11 INFOGRAPHIC runtime을 published Graph 프로파일로 upsert한다.
 * Graph Studio(`/studio/graph`)는 이 행이 있어야 열린다 — 코드가 요구하는 레퍼런스 데이터다.
 *
 * 실행: pnpm payload run scripts/seed-infographic-profile.ts
 * 🔴 대상 DB는 `DATABASE_URL`이 정한다. 어느 환경에 심는지 보고 실행할 것.
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const RUNTIME = 'infographic' as const

const payload = await getPayload({ config })

const existing = await payload.find({
	collection: 'graph-profiles',
	depth: 0,
	where: { runtime: { equals: RUNTIME } },
	limit: 1,
	draft: true,
})

// 미리보기 이미지는 필수지만 이 시드가 고를 정답이 없다 — 붙어 있으면 지키고, 없을 때만
// published 브랜드 이미지 첫 장을 임시로 붙인다. 실제 이미지는 어드민이 바꾼다.
const current = existing.docs[0]?.previewImage
const previewImage =
	typeof current === 'object' && current !== null
		? current.id
		: (current ?? (await pickFallbackPreviewImage()))

async function pickFallbackPreviewImage() {
	const images = await payload.find({
		collection: 'application-images',
		depth: 0,
		limit: 1,
		select: { filename: true },
		sort: '-updatedAt',
		where: { _status: { equals: 'published' } },
	})
	const image = images.docs[0]
	if (!image) {
		throw new Error(
			'미리보기 이미지로 쓸 published 브랜드 이미지가 없습니다. 어드민에서 한 장 업로드한 뒤 다시 실행하세요.',
		)
	}
	console.log(`previewImage 임시 지정: application-images#${image.id} (${image.filename})`)
	return image.id
}

const data = {
	name: 'Infographic',
	runtime: RUNTIME,
	displayOrder: 20,
	previewImage,
	_status: 'published' as const,
}

if (existing.docs[0]) {
	await payload.update({
		collection: 'graph-profiles',
		id: existing.docs[0].id,
		data,
		draft: false,
	})
	console.log(`updated: ${data.name}`)
} else {
	await payload.create({ collection: 'graph-profiles', data, draft: false })
	console.log(`created: ${data.name}`)
}

process.exit(0)
