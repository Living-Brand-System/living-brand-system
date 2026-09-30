import type { Payload } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	deleteDraftImportedApplicationImage,
	storeDraftImportedApplicationImage,
} from '@/features/application-image/repositories/imported-application-image.payload.repository'
import {
	downloadFigmaImage,
	findFigmaImageFillUrls,
	findFigmaImageUrls,
	findFigmaNodeTree,
} from '@/features/template-import/repositories/figma.rest.repository'
import { findFigmaToken } from '@/features/template-import/repositories/figma-token.payload.repository'
import type { FigmaTextStyle } from '@/features/template-import/utils/figma-ir'
import type { User } from '@/payload-types'
import { importFigmaHtml } from './import-figma-html.service'

vi.mock('@/features/template-import/repositories/figma.rest.repository', () => ({
	downloadFigmaImage: vi.fn(),
	findFigmaImageFillUrls: vi.fn(),
	findFigmaImageUrls: vi.fn(),
	findFigmaNodeTree: vi.fn(),
}))

vi.mock('@/features/template-import/repositories/figma-token.payload.repository', () => ({
	findFigmaToken: vi.fn(),
}))

vi.mock(
	'@/features/application-image/repositories/imported-application-image.payload.repository',
	() => ({
		deleteDraftImportedApplicationImage: vi.fn(),
		storeDraftImportedApplicationImage: vi.fn(),
	}),
)

const payload = {} as Payload
const user = { id: 1, role: 'manager' } as User

const node = {
	id: '1:1',
	name: 'card',
	type: 'FRAME',
	absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
	children: [
		{
			id: '1:2',
			name: 'logo',
			type: 'VECTOR',
			absoluteBoundingBox: { x: 20, y: 30, width: 80, height: 40 },
		},
	],
}

describe('importFigmaHtml', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.mocked(findFigmaToken).mockResolvedValue('user-token')
	})

	it('요청한 사용자의 토큰으로 Figma를 읽는다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue({ ...node, children: [] })

		await importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user)

		expect(findFigmaToken).toHaveBeenCalledWith(payload, 1)
		expect(findFigmaNodeTree).toHaveBeenCalledWith('user-token', 'file', '1:1')
	})

	it('토큰을 등록하지 않았으면 Figma를 부르기 전에 막는다', async () => {
		vi.mocked(findFigmaToken).mockResolvedValue(null)

		await expect(
			importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user),
		).rejects.toMatchObject({ name: 'FigmaConfigurationError' })
		expect(findFigmaNodeTree).not.toHaveBeenCalled()
	})

	it('VECTOR를 SVG Application Images draft로 받아 구조화 참조를 HTML에 저장한다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue(node)
		vi.mocked(findFigmaImageUrls).mockResolvedValue({
			'1:2': 'https://figma.example/logo.svg',
		})
		vi.mocked(downloadFigmaImage).mockResolvedValue({
			data: Buffer.from('<svg viewBox="0 0 80 40"/>'),
			mimeType: 'image/svg+xml',
		})
		vi.mocked(storeDraftImportedApplicationImage).mockResolvedValue({
			collection: 'application-images',
			id: 10,
			url: '/api/application-images/file/figma-vector.svg',
			created: true,
		})

		const result = await importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user)

		expect(findFigmaImageUrls).toHaveBeenCalledWith('user-token', 'file', ['1:2'], 'svg')
		expect(storeDraftImportedApplicationImage).toHaveBeenCalledWith(
			payload,
			user,
			expect.objectContaining({
				data: expect.any(Buffer),
				filename: expect.stringMatching(/^figma-[a-f0-9]{24}\.svg$/),
				mimeType: 'image/svg+xml',
				name: 'logo',
			}),
		)
		expect(result.html).toContain('src="/api/application-images/file/figma-vector.svg"')
		expect(result.html).toContain('data-asset-collection="application-images"')
		expect(result.html).toContain('data-asset-id="10"')
		expect(result.html).not.toContain('data:image/svg+xml')
		expect(result.html).not.toContain('https://figma.example')
	})

	it('VECTOR SVG 렌더가 누락되면 빈 div를 저장하지 않고 실패한다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue(node)
		vi.mocked(findFigmaImageUrls).mockResolvedValue({})

		await expect(
			importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user),
		).rejects.toThrow('Figma SVG render failed for node "1:2".')
		expect(storeDraftImportedApplicationImage).not.toHaveBeenCalled()
	})

	it('렌더 URL이 일부 누락되면 다운로드 전에 실패한다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue({
			...node,
			children: [node.children[0], { ...node.children[0], id: '1:3' }],
		})
		vi.mocked(findFigmaImageUrls).mockResolvedValue({
			'1:2': 'https://figma.example/logo.svg',
		})

		await expect(
			importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user),
		).rejects.toThrow('Figma SVG render failed for node "1:3".')
		expect(storeDraftImportedApplicationImage).not.toHaveBeenCalled()
	})

	it('뒤 에셋 처리에 실패하면 이번 요청에서 앞서 생성한 에셋을 제거한다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue({
			...node,
			children: [node.children[0], { ...node.children[0], id: '1:3' }],
		})
		vi.mocked(findFigmaImageUrls).mockResolvedValue({
			'1:2': 'https://figma.example/logo.svg',
			'1:3': 'https://figma.example/logo-2.svg',
		})
		vi.mocked(downloadFigmaImage)
			.mockResolvedValueOnce({ data: Buffer.from('<svg/>'), mimeType: 'image/svg+xml' })
			.mockRejectedValueOnce(new Error('Figma image download failed (500)'))
		vi.mocked(storeDraftImportedApplicationImage).mockResolvedValue({
			collection: 'application-images',
			id: 10,
			url: '/api/application-images/file/logo.svg',
			created: true,
		})

		await expect(
			importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user),
		).rejects.toThrow('Figma image download failed (500)')
		expect(deleteDraftImportedApplicationImage).toHaveBeenCalledWith(payload, user, 10)
	})

	it('보이지 않는 VECTOR는 Figma 렌더와 저장을 요청하지 않는다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue({
			...node,
			children: [{ ...node.children[0], visible: false }],
		})

		await importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user)

		expect(findFigmaImageUrls).not.toHaveBeenCalled()
		expect(storeDraftImportedApplicationImage).not.toHaveBeenCalled()
	})

	it('단일 IMAGE fill은 원본을 background-image로 낮추고 자식 구조를 보존한다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue({
			...node,
			children: [
				{
					id: '1:4',
					name: 'photo frame',
					type: 'FRAME',
					fills: [{ type: 'IMAGE', imageRef: 'ref-1', scaleMode: 'FILL' }],
					absoluteBoundingBox: { x: 10, y: 10, width: 120, height: 80 },
					children: [
						{
							id: '1:5',
							name: 'caption',
							type: 'TEXT',
							characters: 'hello',
							absoluteBoundingBox: { x: 20, y: 20, width: 80, height: 20 },
						},
					],
				},
			],
		})
		vi.mocked(findFigmaImageFillUrls).mockResolvedValue({
			'ref-1': 'https://figma.example/fill-1.png',
		})
		vi.mocked(downloadFigmaImage).mockResolvedValue({
			data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
			mimeType: 'image/jpeg',
		})
		vi.mocked(storeDraftImportedApplicationImage).mockResolvedValue({
			collection: 'application-images',
			id: 11,
			url: '/api/application-images/file/photo.jpeg',
			created: true,
		})

		const result = await importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user)

		// 노드 렌더가 아니라 파일 단위 fill 원본을 쓴다.
		expect(findFigmaImageUrls).not.toHaveBeenCalled()
		expect(findFigmaImageFillUrls).toHaveBeenCalledWith('user-token', 'file')
		expect(storeDraftImportedApplicationImage).toHaveBeenCalledWith(
			payload,
			user,
			expect.objectContaining({
				filename: expect.stringMatching(/^figma-[a-f0-9]{24}\.jpeg$/),
				mimeType: 'image/jpeg',
				name: 'photo frame',
			}),
		)
		expect(result.html).toContain(
			'background-image:url(/api/application-images/file/photo.jpeg)',
		)
		expect(result.html).toContain('background-size:cover')
		// IMAGE fill 프레임이 이미지로 구워지지 않고 자식 텍스트가 살아남는다.
		expect(result.html).toContain('data-node-id="1:5"')
		expect(result.html).toContain('>hello</p>')
		// 발행 승격을 위한 에셋 메타데이터가 div에 실린다.
		expect(result.html).toContain('data-asset-id="11"')
	})

	it('IMAGE fill이 다른 fill과 겹치거나 텍스트에 걸리면 기존처럼 PNG로 렌더한다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue({
			...node,
			children: [
				{
					id: '1:6',
					name: 'layered',
					type: 'RECTANGLE',
					fills: [
						{ type: 'IMAGE', imageRef: 'ref-2' },
						{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 0.4 } },
					],
					absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
				},
				{
					id: '1:7',
					name: 'image text',
					type: 'TEXT',
					characters: 'hi',
					fills: [{ type: 'IMAGE', imageRef: 'ref-3' }],
					absoluteBoundingBox: { x: 0, y: 100, width: 100, height: 30 },
				},
			],
		})
		vi.mocked(findFigmaImageUrls).mockResolvedValue({
			'1:6': 'https://figma.example/layered.png',
			'1:7': 'https://figma.example/image-text.png',
		})
		vi.mocked(downloadFigmaImage).mockResolvedValue({
			data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
			mimeType: 'image/png',
		})
		vi.mocked(storeDraftImportedApplicationImage).mockResolvedValue({
			collection: 'application-images',
			id: 12,
			url: '/api/application-images/file/layered.png',
			created: true,
		})

		await importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user)

		expect(findFigmaImageUrls).toHaveBeenCalledWith('user-token', 'file', ['1:6', '1:7'], 'png')
		expect(findFigmaImageFillUrls).not.toHaveBeenCalled()
	})

	it('TEXT_PATH와 알 수 없는 leaf node만 PNG fallback하고 SLICE는 기존 동작을 유지한다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue({
			...node,
			children: [
				{
					id: '5:1',
					name: 'curved title',
					type: 'TEXT_PATH',
					absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 40 },
				},
				{
					id: '6:1',
					name: 'future node',
					type: 'FUTURE_NODE',
					absoluteBoundingBox: { x: 0, y: 50, width: 80, height: 80 },
				},
				{
					id: '7:1',
					name: 'export slice',
					type: 'SLICE',
					absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
				},
			],
		})
		vi.mocked(findFigmaImageUrls).mockResolvedValue({
			'5:1': 'https://figma.example/text-path.png',
			'6:1': 'https://figma.example/future.png',
		})
		vi.mocked(downloadFigmaImage).mockResolvedValue({
			data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
			mimeType: 'image/png',
		})
		vi.mocked(storeDraftImportedApplicationImage)
			.mockResolvedValueOnce({
				collection: 'application-images',
				id: 15,
				url: '/api/application-images/file/text-path.png',
				created: true,
			})
			.mockResolvedValueOnce({
				collection: 'application-images',
				id: 16,
				url: '/api/application-images/file/future.png',
				created: true,
			})

		const result = await importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user)

		expect(findFigmaImageUrls).toHaveBeenCalledWith('user-token', 'file', ['5:1', '6:1'], 'png')
		expect(result.html).toContain('src="/api/application-images/file/text-path.png"')
		expect(result.html).toContain('src="/api/application-images/file/future.png"')
		expect(result.html).toContain('data-node-id="7:1"')
	})

	it('mask 합성과 scale 레이어는 PNG로 고정하고, 순수 회전은 CSS transform으로 살린다', async () => {
		vi.mocked(findFigmaNodeTree).mockResolvedValue({
			...node,
			children: [
				{
					id: '2:1',
					name: 'masked group',
					type: 'GROUP',
					absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
					children: [
						{ id: '2:2', type: 'RECTANGLE', isMask: true },
						{ id: '2:3', type: 'RECTANGLE', fills: [{ type: 'IMAGE' }] },
					],
				},
				{
					id: '3:1',
					name: 'rotated title',
					type: 'TEXT',
					rotation: 12,
					characters: 'Title',
					absoluteBoundingBox: { x: 120, y: 0, width: 80, height: 30 },
				},
				{
					id: '4:1',
					name: 'scaled frame',
					type: 'FRAME',
					relativeTransform: [
						[1.5, 0, 220],
						[0, 1.5, 0],
					],
					absoluteBoundingBox: { x: 220, y: 0, width: 150, height: 150 },
				},
			],
		})
		vi.mocked(findFigmaImageUrls).mockResolvedValue({
			'2:1': 'https://figma.example/mask.png',
			'4:1': 'https://figma.example/scaled.png',
		})
		vi.mocked(downloadFigmaImage).mockResolvedValue({
			data: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
			mimeType: 'image/png',
		})
		vi.mocked(storeDraftImportedApplicationImage)
			.mockResolvedValueOnce({
				collection: 'application-images',
				id: 12,
				url: '/api/application-images/file/mask.png',
				created: true,
			})
			.mockResolvedValueOnce({
				collection: 'application-images',
				id: 14,
				url: '/api/application-images/file/scaled.png',
				created: true,
			})

		const result = await importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user)

		expect(findFigmaImageUrls).toHaveBeenCalledWith('user-token', 'file', ['2:1', '4:1'], 'png')
		expect(result.html).not.toContain('data-node-id="2:2"')
		expect(result.html).toContain('src="/api/application-images/file/mask.png"')
		expect(result.html).toContain('src="/api/application-images/file/scaled.png"')
		// 순수 회전 텍스트는 이미지가 아니라 편집 가능한 <p> + CSS rotate로 남는다.
		expect(result.html).toContain('>Title</p>')
		expect(result.html).toContain('transform:rotate(-12deg)')
		// 구워진 레이어마다 이유가 진단으로 남는다.
		expect(result.diagnostics).toEqual([
			expect.objectContaining({ nodeId: '2:1', reason: '마스크 합성', textLayerCount: 0 }),
			expect.objectContaining({ nodeId: '4:1', reason: '스케일·기울임 변형' }),
		])
	})

	it('말줄임 줄 수를 유도하지 못한 텍스트만 truncationDiagnostics로 남긴다', async () => {
		const textNode = (id: string, name: string, style: FigmaTextStyle) => ({
			id,
			name,
			type: 'TEXT',
			characters: '아주 긴 텍스트',
			absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
			style: { fontFamily: 'Inter', fontSize: 16, ...style },
		})
		vi.mocked(findFigmaNodeTree).mockResolvedValue({
			...node,
			children: [
				// ENDING인데 maxLines도 줄높이(px)도 없어 clip으로 강등 → 진단.
				textNode('2:1', 'degraded', { textAutoResize: 'NONE', textTruncation: 'ENDING' }),
				// 줄높이(px)로 clamp 줄 수가 유도되므로 진단 없음.
				textNode('2:2', 'clamped', {
					textAutoResize: 'NONE',
					textTruncation: 'ENDING',
					lineHeightUnit: 'PIXELS',
					lineHeightPx: 20,
				}),
				// 말줄임 의도 자체가 없으면 진단 없음.
				textNode('2:3', 'plain', { textAutoResize: 'NONE', textTruncation: 'DISABLED' }),
			],
		})

		const result = await importFigmaHtml({ fileKey: 'file', nodeId: '1:1' }, payload, user)

		expect(result.truncationDiagnostics).toEqual([{ nodeId: '2:1', name: 'degraded' }])
	})
})
