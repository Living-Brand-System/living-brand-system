import { randomUUID } from 'node:crypto'
import config from '@payload-config'
import { getPayload } from 'payload'
import type { GeneratedImageHistoryItem } from '@/features/image-generation/domain/generated-image-history'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import { isPayloadUser } from '@/lib/auth'
import type { ImageProfile } from '@/payload-types'
import { decodeImageDataUri, MAX_IMAGE_BYTES, validateRasterImage } from '../image-data-uri'

export interface StoredGeneratedImage {
	collection: 'generated-images'
	createdAt: string
	id: number
	url: string
}

/**
 * 참조 생성에 쓸 이미지 한 장의 해석 결과 — 어느 소스에서 왔든 이 형태로 수렴한다.
 * 소스마다 소유권 검증이 다르므로 검증은 각 해석 함수가 소유한다.
 */
export interface ResolvedReference {
	data: Buffer
	/** `sourceImage`에 기록할 대상. 생성 이미지가 아닌 소스는 null. */
	generatedImageId: number | null
	/** 소스가 프롬프트를 함께 제공할 때만 있다. */
	prompt?: { effective: string; input: string }
}

/**
 * 참조 생성에 쓸 published Generated Image를 사용자 권한으로 찾고 원본 파일을 읽는다.
 * Payload 조회와 저장 URL 다운로드 I/O는 이 repository가 소유한다.
 */
export async function resolveGeneratedImageReference(input: {
	generatedImageId: number
	profileId: number
	requestUrl: string
	user: unknown
}): Promise<ResolvedReference | null> {
	const userId = getUserId(input.user)
	if (!userId) return null
	const payload = await getPayload({ config })
	const found = await payload.find({
		collection: 'generated-images',
		depth: 0,
		draft: false,
		limit: 1,
		overrideAccess: true,
		select: {
			effectivePrompt: true,
			filename: true,
			filesize: true,
			inputPrompt: true,
			url: true,
		},
		where: {
			and: [
				{ id: { equals: input.generatedImageId } },
				{ scenario: { equals: input.profileId } },
				{ createdBy: { equals: userId } },
				{ _status: { equals: 'published' } },
			],
		},
	})
	const image = found.docs[0]
	if (
		!image?.url ||
		typeof image.effectivePrompt !== 'string' ||
		typeof image.inputPrompt !== 'string' ||
		typeof image.filesize !== 'number' ||
		image.filesize <= 0 ||
		image.filesize > MAX_IMAGE_BYTES
	) {
		return null
	}

	const response = await fetch(new URL(image.url, input.requestUrl))
	if (!response.ok || !response.body) throw new Error('Stored generated image is unavailable.')

	const chunks: Uint8Array[] = []
	let size = 0
	const reader = response.body.getReader()
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		size += value.byteLength
		if (size > MAX_IMAGE_BYTES) {
			await reader.cancel()
			throw new Error('Stored generated image is too large.')
		}
		chunks.push(value)
	}

	return {
		data: (
			await validateRasterImage(
				Buffer.concat(chunks, size),
				response.headers.get('content-type'),
			)
		).data,
		generatedImageId: input.generatedImageId,
		prompt: { effective: image.effectivePrompt, input: image.inputPrompt },
	}
}

function getUserId(user: unknown): number | null {
	const id = typeof user === 'object' && user !== null && 'id' in user ? user.id : null
	return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null
}

/**
 * 프로파일 기반 생성 결과를 공개 가능한 Generated Images 파일로 저장한다.
 * Payload upload와 실패 시 부분 생성 파일 정리는 이 repository가 소유한다.
 */
export async function storeGeneratedImages(input: {
	createdBy: number
	effectivePrompt: string
	images: readonly string[]
	inputPrompt: string
	model: string
	profile: Pick<ImageProfile, 'id' | 'name'> & {
		aspectRatio: ImageAspectRatio
		imageSize: ImageOutputSize
	}
	/** 참조해서 만든 결과면 그 원본 생성 이미지 id. 없으면 참조 없이 만든 이미지다. */
	sourceImage?: number
}): Promise<StoredGeneratedImage[]> {
	const payload = await getPayload({ config })
	const createdIds: number[] = []
	// 이 호출이 곧 한 번의 생성 요청이다 — 여기서 만든 키를 이번 장 전체가 나눠 갖는다.
	const batchKey = randomUUID()

	try {
		const stored: StoredGeneratedImage[] = []
		for (const image of input.images) {
			const file = await decodeImageDataUri(image)
			const created = await payload.create({
				collection: 'generated-images',
				data: {
					_status: 'published',
					aspectRatio: input.profile.aspectRatio,
					batchKey,
					createdBy: input.createdBy,
					effectivePrompt: input.effectivePrompt,
					imageSize: input.profile.imageSize,
					inputPrompt: input.inputPrompt,
					model: input.model,
					scenario: input.profile.id,
					scenarioName: input.profile.name,
					...(input.sourceImage ? { sourceImage: input.sourceImage } : {}),
				},
				draft: false,
				file: {
					data: file.data,
					mimetype: file.mimeType,
					name: `generated-${randomUUID()}.${file.extension}`,
					size: file.data.byteLength,
				},
				overrideAccess: true,
			})
			createdIds.push(created.id)
			if (!created.url) throw new Error('Stored generated image has no URL.')
			stored.push({
				collection: 'generated-images',
				createdAt: created.createdAt,
				id: created.id,
				url: created.url,
			})
		}
		return stored
	} catch (error) {
		await Promise.allSettled(
			createdIds.map((id) =>
				payload.delete({
					collection: 'generated-images',
					id,
					overrideAccess: true,
				}),
			),
		)
		throw error
	}
}

/** 사용자 권한으로 published 생성 이미지를 최신순으로 조회한다. */
export async function listGeneratedImageHistory(input: {
	/** true면 manager가 admin에서 켜 둔 본보기만 본다. */
	bestOnly?: boolean
	limit: number
	page: number
	user: unknown
}): Promise<{ items: GeneratedImageHistoryItem[]; hasMore: boolean }> {
	if (!isPayloadUser(input.user)) {
		throw new Error('Authenticated generated image consumer is required.')
	}
	const payload = await getPayload({ config })
	const found = await payload.find({
		collection: 'generated-images',
		// scenario는 id만 필요하다 — 이름은 생성 당시 값을 박아 둔 scenarioName이 갖는다.
		depth: 0,
		draft: false,
		limit: input.limit,
		// 🔴 field access를 그대로 태운다. 우회하면 컬렉션이 선언한 권한 경계가 무의미해진다.
		overrideAccess: false,
		page: input.page,
		select: {
			aspectRatio: true,
			batchKey: true,
			createdAt: true,
			// 🔴 filename이 없으면 url이 null로 온다 — Payload가 url을 filename에서 파생하므로
			//    select에서 빼면 파생이 통째로 꺼진다. url만 적으면 조용히 전부 버려진다.
			filename: true,
			imageSize: true,
			inputPrompt: true,
			scenario: true,
			scenarioName: true,
			url: true,
		},
		sort: '-createdAt',
		user: input.user as never,
		where: input.bestOnly
			? { and: [{ _status: { equals: 'published' } }, { bestSample: { equals: true } }] }
			: { _status: { equals: 'published' } },
	})

	return {
		hasMore: found.hasNextPage ?? false,
		items: found.docs.flatMap((document) => {
			if (!document.url) return []
			return [
				{
					aspectRatio: (document.aspectRatio as ImageAspectRatio | undefined) ?? null,
					batchKey: document.batchKey ?? null,
					createdAt: document.createdAt,
					id: document.id,
					imageSize: (document.imageSize as ImageOutputSize | undefined) ?? null,
					profileId: typeof document.scenario === 'number' ? document.scenario : null,
					profileName: document.scenarioName ?? null,
					prompt: document.inputPrompt ?? null,
					url: document.url,
				},
			]
		}),
	}
}
