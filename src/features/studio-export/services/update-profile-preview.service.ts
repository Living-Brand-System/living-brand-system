import { storePublishedApplicationImage } from '@/features/application-image/services/store-application-image.service'
import {
	type StudioPreviewImage,
	toStudioPreviewImage,
} from '@/modules/studio-controller/controller-definition'
import type { User } from '@/payload-types'
import {
	findStudioProfile,
	type StudioProfileLookup,
	updateStudioProfilePreview,
} from '@/repositories/studio-profile.payload.repository'

/**
 * 스튜디오 종류 → 프로파일 컬렉션과 **식별 방법**. 화면이 컬렉션 이름을 알지 않게 하는 경계다.
 *
 * 🔑 graphic·graph는 숫자 id가 아니라 `runtime`으로 찾는다 — Studio Config의 `id`가 런타임 id이고
 * (`list-graphic-studio-configs.service.test.ts`가 계약으로 단정한다), `runtime` 필드가 unique라
 * 프로파일과 1:1이다. 환경마다 값이 달라지지 않아 숫자 id보다 오히려 안정적이다.
 */
const PROFILE_TARGETS = {
	graphic: { collection: 'graphic-profiles', by: 'runtime' },
	graph: { collection: 'graph-profiles', by: 'runtime' },
	image: { collection: 'image-profiles', by: 'id' },
	template: { collection: 'templates', by: 'id' },
} as const

export type StudioPreviewKind = keyof typeof PROFILE_TARGETS

export function isStudioPreviewKind(value: unknown): value is StudioPreviewKind {
	// `in`은 `toString` 같은 프로토타입 키도 통과시킨다 — 자기 키만 본다.
	return typeof value === 'string' && Object.hasOwn(PROFILE_TARGETS, value)
}

export class StudioProfileNotFoundError extends Error {
	constructor() {
		super('프로파일을 찾을 수 없습니다.')
		this.name = 'StudioProfileNotFoundError'
	}
}

/** 발행본 위에 admin 초안이 얹혀 있다 — 메시지는 사용자에게 그대로 보여 줄 문구다. */
export class StudioProfileDraftPendingError extends Error {
	constructor() {
		super(
			'admin에 발행하지 않은 초안이 있어요. 초안을 발행하거나 되돌린 뒤 썸네일을 갱신해 주세요.',
		)
		this.name = 'StudioProfileDraftPendingError'
	}
}

/**
 * 스튜디오에서 지금 보고 있는 화면을 그 프로파일의 미리보기 이미지로 박는다.
 *
 * 🔑 새 `application-images` 행을 만들고 관계만 갈아끼운다 — 기존 행의 파일을 덮으면 URL이 그대로라
 * 브라우저가 옛 이미지를 계속 보여준다(교체했는데 안 바뀌는 것처럼 보이는 원인).
 * 🔴 발행본 위에 초안이 얹혀 있으면 갱신하지 않는다. update는 최신(초안) 버전 위에 쓰므로
 *    `draft`로 되쓰면 발행이 풀리고, `published`로 되쓰면 그 초안이 몰래 발행된다.
 */
export async function updateProfilePreview({
	studio,
	profileId,
	png,
	user,
}: {
	studio: StudioPreviewKind
	profileId: string
	png: Buffer
	user: User
}): Promise<StudioPreviewImage | undefined> {
	const target = PROFILE_TARGETS[studio]
	const lookup: StudioProfileLookup =
		target.by === 'id'
			? { collection: target.collection, by: 'id', id: Number(profileId) }
			: { collection: target.collection, by: 'runtime', runtime: profileId }

	const current = await findStudioProfile(lookup, { draft: true, user })
	if (!current) throw new StudioProfileNotFoundError()
	if (
		current._status === 'draft' &&
		(await findStudioProfile(lookup, { draft: false, user }))?._status === 'published'
	) {
		throw new StudioProfileDraftPendingError()
	}

	const label = current.name ?? target.collection
	const image = await storePublishedApplicationImage({
		name: `${label} 미리보기`,
		alt: `${label} 미리보기 이미지`,
		data: png,
		filename: `${target.collection}-${current.id}-preview.png`,
		mimeType: 'image/png',
		user,
	})

	const updated = await updateStudioProfilePreview({
		collection: target.collection,
		id: current.id,
		previewImageId: image.id,
		status: current._status,
		user,
	})
	return toStudioPreviewImage(updated.previewImage)
}
