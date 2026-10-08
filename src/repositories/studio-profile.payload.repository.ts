import config from '@payload-config'
import { getPayload } from 'payload'
import type { User } from '@/payload-types'

/**
 * 스튜디오 프로파일 4종에 **같은 동작**을 거는 cross-domain 저장소 — 소유 경계가 없어 `src/repositories`에 둔다
 * (docs/06 §2 경계 규칙 R3). 컬렉션별 도메인 조회는 각 소유 feature의 repository가 갖고, 여기는
 * 「미리보기 이미지 갱신」처럼 네 컬렉션이 공유하는 필드만 다룬다.
 */
export type StudioProfileCollection =
	| 'graphic-profiles'
	| 'graph-profiles'
	| 'image-profiles'
	| 'templates'

/** 네 컬렉션이 공통으로 갖는 것만 본다 — 전체 문서 타입에 묶이면 컬렉션마다 분기가 생긴다. */
export type StudioProfileDocument = {
	id: number
	name?: string | null
	_status?: 'draft' | 'published' | null
	previewImage?: unknown
}

export type StudioProfileLookup =
	| { collection: StudioProfileCollection; by: 'id'; id: number }
	| { collection: StudioProfileCollection; by: 'runtime'; runtime: string }

/** 요청자 권한으로 프로파일 하나를 읽는다. `draft`는 versioned 컬렉션의 어느 버전을 볼지다. */
export async function findStudioProfile(
	lookup: StudioProfileLookup,
	{ draft, user }: { draft: boolean; user: User },
): Promise<StudioProfileDocument | undefined> {
	const payload = await getPayload({ config })
	if (lookup.by === 'id') {
		return (await payload.findByID({
			collection: lookup.collection,
			id: lookup.id,
			depth: 0,
			draft,
			overrideAccess: false,
			user,
		})) as StudioProfileDocument
	}
	const { docs } = await payload.find({
		collection: lookup.collection,
		where: { runtime: { equals: lookup.runtime } },
		depth: 0,
		limit: 1,
		draft,
		overrideAccess: false,
		user,
	})
	return docs[0] as StudioProfileDocument | undefined
}

/**
 * 미리보기 관계만 갈아끼운다.
 * 🔴 `_status`는 호출자가 읽은 값을 그대로 넘긴다. versioned 컬렉션은 이것을 빠뜨리면 최신(초안) 버전의
 *    상태를 따라 써서 **게시 문서가 초안으로 떨어진다**(2026-08-05 실사고).
 */
export async function updateStudioProfilePreview(input: {
	collection: StudioProfileCollection
	id: number
	previewImageId: number
	status: StudioProfileDocument['_status']
	user: User
}): Promise<StudioProfileDocument> {
	const payload = await getPayload({ config })
	return (await payload.update({
		collection: input.collection,
		id: input.id,
		data: { previewImage: input.previewImageId, _status: input.status },
		depth: 1,
		overrideAccess: false,
		user: input.user,
	})) as StudioProfileDocument
}
