import { z } from 'zod'
import { cameraControlSchema } from '@/features/image-generation/domain/camera-control'
import {
	IMAGE_BATCH_DEFAULT,
	IMAGE_BATCH_MAX,
	IMAGE_PROMPT_MAX_LENGTH,
} from '@/features/image-generation/domain/image-generation-limits'
import {
	IMAGE_ASPECT_RATIOS,
	IMAGE_OUTPUT_SIZES,
} from '@/features/image-generation/domain/image-size'
import { IMAGE_REFERENCE_MAX_BYTES } from '@/features/image-generation/domain/reference-image/contract'
import { respondImageGeneration } from '@/features/image-generation/respond-image-generation'
import { generateImages } from '@/features/image-generation/services/generate-image.service'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

export const maxDuration = 120

// 첨부 상한을 base64로 부풀린 길이에 헤더 여유를 더한 값 — sharp를 태우기 전에 본문 크기로 먼저 거른다.
const MAX_REFERENCE_UPLOAD_CHARS = Math.ceil(IMAGE_REFERENCE_MAX_BYTES / 3) * 4 + 64

const requestSchema = z
	.object({
		// 참조가 있으면 그 프롬프트를 물려받으므로 프롬프트는 선택이다.
		prompt: z.string().trim().max(IMAGE_PROMPT_MAX_LENGTH).default(''),
		count: z.number().int().min(1).max(IMAGE_BATCH_MAX).default(IMAGE_BATCH_DEFAULT),
		profileId: z.number().int().positive(),
		// 템플릿 이미지 슬롯 박스에서 유도한 비율 오버라이드 — 없으면 프로파일 비율로 생성한다.
		aspectRatio: z.enum(IMAGE_ASPECT_RATIOS).optional(),
		// 스튜디오 해상도 선택 오버라이드 — 없으면 프로파일 해상도로 생성한다.
		imageSize: z.enum(IMAGE_OUTPUT_SIZES).optional(),
		// 참조 이미지 — 저장된 내 생성 결과이거나, 프로파일이 첨부를 열었을 때의 1회용 data URI다.
		// 첨부는 저장하지 않으므로 매 요청 본문에 실려 온다. 실물 형식·크기 검증은 서비스가 소유한다.
		reference: z
			.union([
				z.strictObject({ generatedImageId: z.number().int().positive() }),
				z.strictObject({ upload: z.string().max(MAX_REFERENCE_UPLOAD_CHARS) }),
			])
			.optional(),
		camera: cameraControlSchema.optional(),
	})
	.strict()
	.refine(
		// 저장된 생성 결과만 프롬프트를 물려준다. 첨부에는 물려줄 프롬프트가 없어 프롬프트가 필수다.
		(value) =>
			value.prompt.length > 0 ||
			(value.reference !== undefined && 'generatedImageId' in value.reference),
		'prompt or stored reference is required.',
	)

export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { payload, user } = await authenticateRequest()
	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}

	const parsed = requestSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) {
		return Response.json({ message: 'Invalid request.' }, { status: 400 })
	}

	const {
		prompt: userInput,
		count,
		profileId,
		aspectRatio,
		imageSize,
		camera,
		reference,
	} = parsed.data

	return respondImageGeneration({
		run: () =>
			generateImages({
				userInput,
				profileId,
				user,
				count,
				// 이 라우트의 유일한 화면이 이미지 스튜디오다.
				studio: 'image',
				aspectRatio,
				imageSize,
				...(camera ? { camera } : {}),
				// 저장된 생성 결과만 서버가 다시 받아 온다 — 첨부는 이미 본문에 실려 있어 주소가 필요 없다.
				...(reference
					? {
							reference:
								'upload' in reference
									? reference
									: { ...reference, requestUrl: request.url },
						}
					: {}),
			}),
		logger: payload.logger,
		event: 'image-generation',
		doneLog: (result) => ({
			profileId: result.profileId,
			provider: result.provider,
			model: result.model,
			promptLength: result.prompt.length,
			count: result.images.length,
		}),
	})
}
