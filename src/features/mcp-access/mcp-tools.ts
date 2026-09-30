import type { PayloadRequest } from 'payload'
import sharp from 'sharp'
import { z } from 'zod/v3'
import { findTemplatesForRequest } from '@/features/agent-chat/services/agent-template-request.service'
import { searchAgentGuidelines } from '@/features/agent-chat/services/get-agent-guideline-context.service'
import { buildAiObservationTask } from '@/features/asset-check/domain/ai-observation-task'
import {
	aiReferenceAssetKey,
	findUnavailableAiReferenceCheckKeys,
	loadAiReferenceFiles,
} from '@/features/asset-check/repositories/ai-check.ai.repository'
import { resizeForAiVision } from '@/features/asset-check/repositories/image-decoder.sharp.repository'
import {
	type ClientCheckObservations,
	completeCheckSessionObservations,
	startCheckSession,
} from '@/features/asset-check/services/start-check-session.service'
import {
	findMcpChecks,
	findMcpGuideline,
	findMcpGuidelineDocuments,
} from '@/features/guideline/services/find-mcp-guideline.service'
import { decodeImageDataUri } from '@/features/image-generation/image-data-uri'
import { resolveGeneratedImageReference } from '@/features/image-generation/repositories/generated-image.payload.repository'
import { generateImages } from '@/features/image-generation/services/generate-image.service'
import { listAvailableImageProfiles } from '@/features/image-generation/services/list-image-profiles.service'
import { isPayloadUser } from '@/lib/auth'
import { type McpToolName, mcpToolNames } from './mcp-tool-names'

/** MCP 도구 인자를 zod 스키마로 한 번 파싱해 타입이 보장된 핸들러에 넘긴다. 스키마에 어긋나면 즉시 실패한다. */
const mcpTool = <P extends z.ZodRawShape, R>(
	name: McpToolName,
	description: string,
	parameters: P,
	run: (args: z.infer<z.ZodObject<P>>, req: PayloadRequest) => Promise<R>,
) => ({
	name,
	description,
	parameters,
	handler: async (args: Record<string, unknown>, req: PayloadRequest) =>
		run(z.object(parameters).parse(args), req),
})

/** MCP 조회 도구가 기능 서비스 결과를 공통 text 콘텐츠로 반환하게 한다. */
const mcpTextTool = <P extends z.ZodRawShape>(
	name: McpToolName,
	description: string,
	parameters: P,
	run: (args: z.infer<z.ZodObject<P>>, req: PayloadRequest) => Promise<unknown>,
) =>
	mcpTool(name, description, parameters, async (args, req) => ({
		content: [{ type: 'text' as const, text: JSON.stringify(await run(args, req)) }],
	}))

const mcpListParameters = {
	limit: z.number().int().min(1).max(100).optional(),
	locale: z.enum(['ko', 'en']).optional(),
	page: z.number().int().min(1).optional(),
}
const clientObservationSchema = z.strictObject({
	value: z.union([z.number(), z.enum(['present', 'absent', 'uncertain', 'not_applicable'])]),
	confidence: z.number().min(0).max(100),
	reason: z.string().trim().min(1).max(300),
})
const user = (req: PayloadRequest) => {
	if (!isPayloadUser(req.user)) throw new Error('Authentication required.')
	return req.user
}

// ponytail: MCP tools only validate transport input and reuse the existing feature services.
// 노출 순서와 grant 키의 단일 원본은 mcp-tool-names.ts — 도구 추가 시 그 목록부터 늘린다.
export const customMcpTools = [
	mcpTextTool(
		'findGuidelineDocuments',
		'Find published guideline read documents. The active contentModel returns ordered sections or legacy blocks. sections include id, headingLevel and parentSectionId; contentGroups describe layout; figures combine visual, caption, author-assigned usageStatus, controls and actions. Caption types: basic title/description, list rows pairing label/value as item title/description, specification rows pairing property/value (including original units). Defaults and accessible asset/palette relationships are already resolved. Preserve all orders and figure-caption associations. usageStatus is not a check result. controls describe display changes with options/defaultValue/effect; actions describe download, link, copy or reset, not executable MCP tools or current user state. Legacy blocks retain their compatibility fields and resolved text. Do not infer unavailable assets from null values.',
		mcpListParameters,
		(args, req) => findMcpGuidelineDocuments(req, args),
	),
	mcpTextTool(
		'findChecks',
		'Find rules applied by published guideline documents and blocks.',
		mcpListParameters,
		(args, req) => findMcpChecks(req, args),
	),
	mcpTextTool(
		'findGuideline',
		'Find live top-level guideline document metadata.',
		{ locale: z.enum(['ko', 'en']).optional() },
		(args, req) => findMcpGuideline(req, args),
	),
	mcpTextTool(
		'searchGuidelines',
		'Search published brand guideline titles, paths, descriptions, body content, and checks.',
		{ query: z.string().trim().min(1).max(120) },
		(args, req) => searchAgentGuidelines(user(req), { query: args.query }),
	),
	mcpTextTool(
		'findTemplates',
		'Find or list published production templates and their open slots.',
		{ query: z.string().trim().min(1).max(120).optional() },
		(args, req) => findTemplatesForRequest(user(req), args.query),
	),
	mcpTextTool(
		'listImageProfiles',
		'List published brand image profiles available to the current user.',
		{},
		(_args, req) => listAvailableImageProfiles(user(req)),
	),
	mcpTool(
		'runAssetCheck',
		'Run deterministic checks and return the image plus observation questions for the connected AI. Follow with submitAssetCheckObservations.',
		{
			imageData: z.string().max(4_000_000),
			imageName: z.string().trim().min(1).max(120).optional(),
			scenarioKey: z.string().trim().min(1).max(80).optional(),
		},
		async (args, req) => {
			const image = await decodeImageDataUri(args.imageData)
			const { checkSessionId, pendingCheckKeys, results, rulesetSnapshot } =
				await startCheckSession({
					buffer: image.data,
					deferHeuristic: 'always',
					imageName: args.imageName ?? 'mcp-image',
					scenarioKey: args.scenarioKey,
					source: 'mcp-call',
					user: user(req),
				})
			const pending = rulesetSnapshot.filter((check) => pendingCheckKeys.includes(check.key))
			const referenceFilesByKey = await loadAiReferenceFiles(pending)
			const referenceKeys = new Set(
				pending.flatMap((check) => check.referenceAssets.map(aiReferenceAssetKey)),
			)
			const referenceFiles = [...referenceKeys].flatMap((key) => {
				const file = referenceFilesByKey.get(key)
				return file ? [file] : []
			})
			const observationTask = buildAiObservationTask(pending, referenceFiles.length > 0)
			const task = {
				checkSessionId,
				status: pending.length ? 'awaiting_client_observations' : 'completed',
				results,
				pendingCheckKeys,
				unavailableReferenceCheckKeys: findUnavailableAiReferenceCheckKeys(
					pending,
					referenceFilesByKey,
				),
				nextTool: pending.length ? 'submitAssetCheckObservations' : null,
				...observationTask,
			}
			const content: (
				| { type: 'text'; text: string }
				| { type: 'image'; data: string; mimeType: string }
			)[] = [{ type: 'text', text: JSON.stringify(task) }]
			if (pending.length) {
				content.push(
					{ type: 'text' as const, text: 'Target image to check:' },
					{
						type: 'image' as const,
						data: (await resizeForAiVision(image.data)).toString('base64'),
						mimeType: image.mimeType,
					},
					...referenceFiles.flatMap((file) => [
						{
							type: 'text' as const,
							text: `Reference image (${file.role}): ${file.name}`,
						},
						{
							type: 'image' as const,
							data: file.data.toString('base64'),
							mimeType: file.mediaType,
						},
					]),
				)
			}

			return { content, structuredContent: task }
		},
	),
	mcpTextTool(
		'submitAssetCheckObservations',
		'Submit observations from the connected AI after runAssetCheck. The server validates them and decides the final result.',
		{
			checkSessionId: z.number().int().positive(),
			observations: z
				.record(z.string(), z.record(z.string(), clientObservationSchema))
				.optional(),
			advices: z.record(z.string(), z.string().trim().min(1).max(2000)).optional(),
		},
		(args, req) =>
			completeCheckSessionObservations({
				advices: args.advices,
				checkSessionId: args.checkSessionId,
				observations: args.observations as ClientCheckObservations | undefined,
				user: user(req),
			}),
	),
	mcpTool(
		'generateBrandImage',
		'Generate and store brand images with a published profile, then return stored original URLs and inline WebP previews.',
		{
			prompt: z.string().trim().min(1).max(500),
			profileId: z.number().int().positive(),
			count: z.number().int().min(1).max(2).optional(),
		},
		async (args, req) => {
			const authenticatedUser = user(req)
			const requestUrl = req.url
			if (!requestUrl) throw new Error('Request URL is required.')
			const result = await generateImages({
				count: args.count ?? 1,
				profileId: args.profileId,
				// 브라우저 화면이 아니라 MCP로 들어온 호출이다 — 사용량 집계에서 갈라 보여야 한다.
				studio: 'mcp',
				user: authenticatedUser,
				userInput: args.prompt,
			})
			const generatedImages = result.generatedImages ?? []
			const previews = await Promise.all(
				generatedImages.map(async ({ id }) => {
					const image = await resolveGeneratedImageReference({
						generatedImageId: id,
						profileId: result.profileId ?? 0,
						requestUrl,
						user: authenticatedUser,
					})
					if (!image) throw new Error('Generated image is unavailable.')
					const preview = await sharp(image.data)
						.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
						.webp({ quality: 82 })
						.toBuffer()
					return {
						type: 'image' as const,
						data: preview.toString('base64'),
						mimeType: 'image/webp',
					}
				}),
			)

			return {
				content: [
					{
						type: 'text' as const,
						text: JSON.stringify({
							aspectRatio: result.aspectRatio,
							generatedImages: generatedImages.map((image) => ({
								...image,
								url: new URL(image.url, requestUrl).toString(),
							})),
							imageSize: result.imageSize,
							model: result.model,
							profileId: result.profileId,
							profileName: result.profileName,
							prompt: result.prompt,
						}),
					},
					...previews,
				],
			}
		},
	),
]

// 정의된 도구와 이름 목록이 어긋나면 모듈 로드 시점에 바로 실패시킨다(테스트·부팅 모두에서 잡힘).
if (customMcpTools.map(({ name }) => name).join() !== mcpToolNames.join()) {
	throw new Error('customMcpTools must match mcpToolNames exactly.')
}
