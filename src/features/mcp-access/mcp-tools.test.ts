import type { PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v3'

const mocks = vi.hoisted(() => ({
	completeCheckSessionObservations: vi.fn(),
	findMcpChecks: vi.fn(),
	findMcpGuideline: vi.fn(),
	findMcpGuidelineDocuments: vi.fn(),
	findUnavailableAiReferenceCheckKeys: vi.fn(),
	findTemplatesForRequest: vi.fn(),
	generateImages: vi.fn(),
	listAvailableImageProfiles: vi.fn(),
	loadAiReferenceFiles: vi.fn(),
	resizeForAiVision: vi.fn(),
	resolveGeneratedImageReference: vi.fn(),
	searchAgentGuidelines: vi.fn(),
	startCheckSession: vi.fn(),
}))

vi.mock('@/features/agent-chat/services/agent-template-request.service', () => ({
	findTemplatesForRequest: mocks.findTemplatesForRequest,
}))
vi.mock('@/features/agent-chat/services/get-agent-guideline-context.service', () => ({
	searchAgentGuidelines: mocks.searchAgentGuidelines,
}))
vi.mock('@/features/asset-check/repositories/image-decoder.sharp.repository', () => ({
	resizeForAiVision: mocks.resizeForAiVision,
}))
vi.mock('@/features/asset-check/repositories/ai-check.ai.repository', () => ({
	aiReferenceAssetKey: (asset: { role: string; url: string }) => `${asset.url}:${asset.role}`,
	findUnavailableAiReferenceCheckKeys: mocks.findUnavailableAiReferenceCheckKeys,
	loadAiReferenceFiles: mocks.loadAiReferenceFiles,
}))
vi.mock('@/features/image-generation/repositories/generated-image.payload.repository', () => ({
	resolveGeneratedImageReference: mocks.resolveGeneratedImageReference,
}))
vi.mock('@/features/image-generation/services/generate-image.service', () => ({
	generateImages: mocks.generateImages,
}))
vi.mock('@/features/image-generation/services/list-image-profiles.service', () => ({
	listAvailableImageProfiles: mocks.listAvailableImageProfiles,
}))
vi.mock('@/features/asset-check/services/start-check-session.service', () => ({
	completeCheckSessionObservations: mocks.completeCheckSessionObservations,
	startCheckSession: mocks.startCheckSession,
}))
vi.mock('@/features/guideline/services/find-mcp-guideline.service', () => ({
	findMcpChecks: mocks.findMcpChecks,
	findMcpGuideline: mocks.findMcpGuideline,
	findMcpGuidelineDocuments: mocks.findMcpGuidelineDocuments,
}))

import { mcpToolNames } from './mcp-tool-names'
import { customMcpTools } from './mcp-tools'

const ONE_PIXEL_PNG =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const requestUser = { email: 'worker@example.com', id: 1, role: 'worker' } as const
const request = {
	url: 'https://lbs.example/api/mcp',
	user: requestUser,
} as unknown as PayloadRequest

function getTool(name: string) {
	const tool = customMcpTools.find((candidate) => candidate.name === name)
	if (!tool) throw new Error(`Missing MCP tool: ${name}`)
	return tool
}

describe('custom MCP tools', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.loadAiReferenceFiles.mockResolvedValue(new Map())
		mocks.findUnavailableAiReferenceCheckKeys.mockReturnValue([])
	})

	it('MCP 제작 기능 도구를 노출한다', () => {
		expect(customMcpTools.map(({ name }) => name)).toEqual([
			'findGuidelineDocuments',
			'findChecks',
			'findGuideline',
			'searchGuidelines',
			'findTemplates',
			'listImageProfiles',
			'runAssetCheck',
			'submitAssetCheckObservations',
			'generateBrandImage',
		])
	})

	it('도구 이름과 키 발급 grant 원본이 같은 목록을 공유한다', () => {
		expect(customMcpTools.map(({ name }) => name)).toEqual([...mcpToolNames])
	})

	it('가이드라인 조회 도구가 파싱된 인자를 서비스에 전달한다', async () => {
		mocks.findMcpGuidelineDocuments.mockResolvedValue({ documents: [] })

		await getTool('findGuidelineDocuments').handler({ level: 2, locale: 'ko' }, request)

		expect(mocks.findMcpGuidelineDocuments).toHaveBeenCalledWith(request, {
			locale: 'ko',
		})
	})

	it('스키마에 어긋난 인자는 코어션 없이 검증 오류로 실패한다', async () => {
		await expect(
			getTool('generateBrandImage').handler({ prompt: '제품 사진', profileId: '5' }, request),
		).rejects.toThrow()
		expect(mocks.generateImages).not.toHaveBeenCalled()
	})

	it('검증 대상 이미지와 기대값 없는 관측 질문을 연결된 AI에 반환한다', async () => {
		const image = Buffer.from(ONE_PIXEL_PNG.split(',')[1] ?? '', 'base64')
		mocks.startCheckSession.mockResolvedValue({
			checkSessionId: 9,
			pendingCheckKeys: ['logo.visible'],
			results: { 'logo.clear-space': { rawResult: { status: 'pass' } } },
			rulesetSnapshot: [
				{
					key: 'logo.visible',
					title: 'Logo visible',
					titleKo: '로고 노출',
					source: { documentId: 12 },
					checker: { key: 'asset-check.brand-guideline', type: 'heuristic' },
					executor: 'heuristic',
					prompt: '브랜드 로고 형태를 우선 관찰한다.',
					heuristicPrompt: '원본 비율이 유지되었는지 관찰한다.',
					heuristicCriteria: [
						{
							id: 'visible',
							question: 'Is the logo visible?',
							expected: 'present',
						},
					],
					implemented: true,
					evidence: { type: 'textColumns', columns: [{ body: '로고 원본을 유지한다.' }] },
					referenceAssets: [],
				},
			],
		})
		mocks.resizeForAiVision.mockResolvedValue(image)
		const tool = getTool('runAssetCheck')

		const result = await tool.handler(
			{ imageData: ONE_PIXEL_PNG, imageName: 'logo.png', scenarioKey: 'logo' },
			request,
		)

		expect(result.content).toHaveLength(3)
		expect(result.content[0]).toMatchObject({
			type: 'text',
			text: expect.stringContaining('"nextTool":"submitAssetCheckObservations"'),
		})
		expect(result.content[0]).toMatchObject({
			text: expect.not.stringContaining('"expected"'),
		})
		expect(result.content[0]).toMatchObject({
			text: expect.stringContaining('"checkerPrompt":"브랜드 로고 형태를 우선 관찰한다."'),
		})
		expect(result.content[0]).toMatchObject({
			text: expect.stringContaining('"heuristicPrompt":"원본 비율이 유지되었는지 관찰한다."'),
		})
		expect(result.content[0]).toMatchObject({
			text: expect.stringContaining('"evidence":{"type":"textColumns"'),
		})
		expect(result.content[0]).toMatchObject({
			text: expect.stringContaining('"unavailableReferenceCheckKeys":[]'),
		})
		expect(result.content[2]).toMatchObject({
			type: 'image',
			data: expect.any(String),
			mimeType: 'image/png',
		})
		expect(mocks.startCheckSession).toHaveBeenCalledWith({
			buffer: expect.any(Buffer),
			deferHeuristic: 'always',
			imageName: 'logo.png',
			scenarioKey: 'logo',
			source: 'mcp-call',
			user: requestUser,
		})
		expect(mocks.resizeForAiVision).toHaveBeenCalledWith(expect.any(Buffer))
	})

	it('내부 AI와 같은 레퍼런스 이미지를 연결된 AI에 반환한다', async () => {
		const image = Buffer.from(ONE_PIXEL_PNG.split(',')[1] ?? '', 'base64')
		mocks.startCheckSession.mockResolvedValue({
			checkSessionId: 10,
			pendingCheckKeys: ['logo.shape'],
			results: {},
			rulesetSnapshot: [
				{
					key: 'logo.shape',
					title: 'Logo shape',
					checker: { key: 'asset-check.brand-guideline', type: 'heuristic' },
					executor: 'heuristic',
					heuristicCriteria: [
						{ id: 'shape', question: '원본 형태와 일치하는가?', expected: 'present' },
					],
					implemented: true,
					evidence: '원본 형태를 유지한다.',
					referenceAssets: [
						{
							name: 'logo-master.png',
							url: '/logo-master.png',
							mimeType: 'image/png',
							role: 'positive',
						},
					],
				},
			],
		})
		mocks.resizeForAiVision.mockResolvedValue(image)
		mocks.loadAiReferenceFiles.mockResolvedValue(
			new Map([
				[
					'/logo-master.png:positive',
					{
						name: 'logo-master.png',
						role: 'positive',
						mediaType: 'image/webp',
						data: Buffer.from('reference'),
					},
				],
			]),
		)

		const result = await getTool('runAssetCheck').handler(
			{ imageData: ONE_PIXEL_PNG, imageName: 'logo.png' },
			request,
		)

		expect(result.content).toHaveLength(5)
		expect(result.content[3]).toEqual({
			type: 'text',
			text: 'Reference image (positive): logo-master.png',
		})
		expect(result.content[4]).toEqual({
			type: 'image',
			data: Buffer.from('reference').toString('base64'),
			mimeType: 'image/webp',
		})
	})

	it('검수 입력으로 외부 URL을 받지 않는다', async () => {
		const tool = getTool('runAssetCheck')

		await expect(
			tool.handler({ imageData: 'https://example.com/logo.png' }, request),
		).rejects.toThrow('Invalid image data URI.')
		expect(mocks.startCheckSession).not.toHaveBeenCalled()
	})

	it('연결된 AI의 관측값을 서버 판정 서비스에 제출한다', async () => {
		const observations = {
			'logo.visible': {
				visible: {
					value: 'present',
					confidence: 95,
					reason: '로고가 보입니다.',
				},
			},
		}
		mocks.completeCheckSessionObservations.mockResolvedValue({
			checkSessionId: 9,
			results: { 'logo.visible': { rawResult: { status: 'pass' } } },
		})

		await getTool('submitAssetCheckObservations').handler(
			{ checkSessionId: 9, observations },
			request,
		)

		expect(mocks.completeCheckSessionObservations).toHaveBeenCalledWith({
			advices: undefined,
			checkSessionId: 9,
			observations,
			user: requestUser,
		})
	})

	it('생성 원본 메타데이터와 실제 이미지 미리보기를 함께 반환한다', async () => {
		const image = Buffer.from(ONE_PIXEL_PNG.split(',')[1] ?? '', 'base64')
		mocks.generateImages.mockResolvedValue({
			aspectRatio: '1:1',
			generatedImages: [
				{
					collection: 'generated-images',
					createdAt: '2026-07-31T03:00:00.000Z',
					id: 8,
					url: '/api/generated-images/file/generated.png',
				},
			],
			imageSize: '1K',
			images: ['/api/generated-images/file/generated.png'],
			model: 'gpt-image-2',
			profileId: 5,
			profileName: '제품 이미지',
			prompt: '{"subject":"파란 세럼병"}',
			provider: 'openai',
		})
		mocks.resolveGeneratedImageReference.mockResolvedValue({
			data: image,
			generatedImageId: 8,
			prompt: { effective: '{"subject":"파란 세럼병"}', input: '파란 세럼병' },
		})
		const result = await getTool('generateBrandImage').handler(
			{ prompt: '파란 세럼병', profileId: 5 },
			request,
		)

		expect(mocks.generateImages).toHaveBeenCalledWith({
			count: 1,
			profileId: 5,
			// 브라우저가 아니라 MCP로 들어온 사용량이라 따로 집계된다.
			studio: 'mcp',
			user: requestUser,
			userInput: '파란 세럼병',
		})
		expect(mocks.resolveGeneratedImageReference).toHaveBeenCalledWith({
			generatedImageId: 8,
			profileId: 5,
			requestUrl: 'https://lbs.example/api/mcp',
			user: requestUser,
		})
		expect(result.content).toHaveLength(2)
		expect(result.content[0]).toMatchObject({
			type: 'text',
			text: expect.stringContaining(
				'https://lbs.example/api/generated-images/file/generated.png',
			),
		})
		expect(result.content[1]).toMatchObject({
			type: 'image',
			data: expect.any(String),
			mimeType: 'image/webp',
		})
	})

	it('이미지 생성 수를 두 장 이하로 제한한다', () => {
		const tool = getTool('generateBrandImage')
		const schema = z.object(tool.parameters as Record<string, z.ZodTypeAny>)

		expect(schema.safeParse({ count: 2, profileId: 5, prompt: '제품 사진' }).success).toBe(true)
		expect(schema.safeParse({ count: 3, profileId: 5, prompt: '제품 사진' }).success).toBe(
			false,
		)
	})
})
