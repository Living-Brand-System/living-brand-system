import config from '@payload-config'
import { getPayload } from 'payload'
import type { BrandLogo } from '@/payload-types'

export interface PublishedBrandLogo {
	id: number
	name: string
	url: string
	width: number
	height: number
	ciShape: string | null
	ciVariant: BrandLogo['ciVariant']
}

/** 발행 로고 전부 — 가져오기의 로고 인식과 CI 레이어의 색 버전 선택이 쓴다. 크기를 모르는 파일은 뺀다. */
export async function findPublishedBrandLogos(): Promise<PublishedBrandLogo[]> {
	const payload = await getPayload({ config })
	const found = await payload.find({
		collection: 'brand-logos',
		depth: 0,
		draft: false,
		pagination: false,
		// 서버 내부 조회 — 발행본만 읽으므로 access 재평가를 생략한다.
		overrideAccess: true,
		where: { _status: { equals: 'published' } },
		// url은 filename에서 파생된다 — filename 없이 select하면 url이 null로 온다.
		select: {
			name: true,
			filename: true,
			url: true,
			width: true,
			height: true,
			ciShape: true,
			ciVariant: true,
		},
	})

	return found.docs.flatMap((doc) =>
		doc.url && doc.width && doc.height
			? [
					{
						id: doc.id,
						name: doc.name,
						url: doc.url,
						width: doc.width,
						height: doc.height,
						ciShape: doc.ciShape ?? null,
						ciVariant: doc.ciVariant ?? null,
					},
				]
			: [],
	)
}
