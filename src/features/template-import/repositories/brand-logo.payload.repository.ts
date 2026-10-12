import type { Payload } from 'payload'

export interface PublishedBrandLogo {
	id: number
	name: string
	url: string
	width: number
	height: number
}

/** 로고 인식이 비교할 발행 로고 전부. 크기를 모르는 파일은 비율로 거를 수 없어 뺀다. */
export async function findPublishedBrandLogos(payload: Payload): Promise<PublishedBrandLogo[]> {
	const found = await payload.find({
		collection: 'brand-logos',
		depth: 0,
		draft: false,
		pagination: false,
		// 가져오기 서버 내부 조회 — 발행본만 읽으므로 access 재평가를 생략한다.
		overrideAccess: true,
		where: { _status: { equals: 'published' } },
		// url은 filename에서 파생된다 — filename 없이 select하면 url이 null로 온다.
		select: { name: true, filename: true, url: true, width: true, height: true },
	})

	return found.docs.flatMap((doc) =>
		doc.url && doc.width && doc.height
			? [{ id: doc.id, name: doc.name, url: doc.url, width: doc.width, height: doc.height }]
			: [],
	)
}
