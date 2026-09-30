import { z } from 'zod'
import { IMAGE_MODEL_PRESETS } from '@/features/image-generation/domain/image-model'
import {
	IMAGE_ASPECT_RATIOS,
	IMAGE_OUTPUT_SIZES,
	supportsImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import { respondImageGeneration } from '@/features/image-generation/respond-image-generation'
import {
	generateImages,
	generateImagesWithSettings,
} from '@/features/image-generation/services/generate-image.service'
import { isManager } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

export const maxDuration = 120

const baseFields = {
	prompt: z.string().trim().min(1).max(2_500),
	count: z.number().int().min(1).max(6).default(1),
}

const requestSchema = z.union([
	z
		.object({
			...baseFields,
			aspectRatio: z.enum(IMAGE_ASPECT_RATIOS),
			imageModelPreset: z.enum(IMAGE_MODEL_PRESETS),
			imageSize: z.enum(IMAGE_OUTPUT_SIZES),
		})
		.strict()
		.refine((input) => supportsImageOutputSize(input.imageModelPreset, input.imageSize)),
	z
		.object({
			...baseFields,
			profileId: z.number().int().positive(),
			// 선택한 프레임 박스에서 유도한 비율 오버라이드 — 없으면 프로파일 비율로 생성한다.
			aspectRatio: z.enum(IMAGE_ASPECT_RATIOS).optional(),
		})
		.strict(),
])

export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { payload, user } = await authenticateRequest()
	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}
	if (!isManager(user)) {
		return Response.json({ message: 'Forbidden' }, { status: 403 })
	}

	const parsed = requestSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) {
		return Response.json({ message: 'Invalid request.' }, { status: 400 })
	}

	const { prompt: userInput, count } = parsed.data
	const input = parsed.data

	return respondImageGeneration({
		run: () =>
			'imageModelPreset' in input
				? generateImagesWithSettings({
						userInput,
						count,
						aspectRatio: input.aspectRatio,
						imageModelPreset: input.imageModelPreset,
						imageSize: input.imageSize,
						user,
					})
				: generateImages({
						userInput,
						count,
						profileId: input.profileId,
						aspectRatio: input.aspectRatio,
						user,
					}),
		logger: payload.logger,
		event: 'admin-image-generation',
		doneLog: (result) => ({
			provider: result.provider,
			model: result.model,
			promptLength: result.prompt.length,
			count: result.images.length,
		}),
	})
}
