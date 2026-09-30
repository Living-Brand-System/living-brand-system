// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGraphicRasterArtifact } from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import { createImageArtifacts } from '@/features/image-generation/runtime/image-artifact.client'
import { createTemplateRasterArtifact } from '@/features/template-customization/runtime/template-runtime.client'
import type { VectorSceneArtifact, VideoArtifact } from '@/modules/studio-artifact/studio-artifact'
import { canvasFramesToMp4 } from '../adapters/canvas-frames-to-mp4.mediabunny.client'
import { elementToJpeg } from '../adapters/element-to-jpeg.client'
import { elementToPng } from '../adapters/element-to-png.client'
import {
	executeArtifactExport,
	exportRasterArtifactAsJpeg,
	exportRasterArtifactAsPng,
	exportVectorArtifactAsSvg,
	exportVideoArtifactAsMp4,
} from './export-artifact.client'
import { requestPrintExport } from './export-print.client'

vi.mock('../adapters/canvas-frames-to-mp4.mediabunny.client', () => ({
	canvasFramesToMp4: vi.fn().mockResolvedValue(new Blob(['mp4'], { type: 'video/mp4' })),
}))
vi.mock('../adapters/element-to-png.client', () => ({ elementToPng: vi.fn() }))
vi.mock('../adapters/element-to-jpeg.client', () => ({ elementToJpeg: vi.fn() }))
vi.mock('./export-print.client', () => ({
	requestPrintExport: vi.fn().mockResolvedValue(new Blob(['print'])),
}))
vi.mock('@/features/template-customization/runtime/render-template-raster-stage.client', () => ({
	withTemplateRasterStage: async (
		html: string,
		consume: (element: HTMLElement) => Promise<unknown>,
	) => {
		const element = document.createElement('div')
		element.innerHTML = html
		return consume(element)
	},
}))

const PNG_REQUEST = {
	artifact: 'raster',
	format: 'png',
	colorProfile: { space: 'rgb', icc: 'srgb' },
	options: { scale: 1, transparent: true },
} as const

const JPEG_REQUEST = {
	artifact: 'raster',
	format: 'jpeg',
	colorProfile: { space: 'rgb', icc: 'srgb' },
	options: { quality: 90, scale: 1 },
} as const

class StubImage {
	naturalWidth = 2048
	naturalHeight = 3072
	private listeners: (() => void)[] = []
	addEventListener(type: string, listener: () => void) {
		if (type === 'load') this.listeners.push(listener)
	}
	set src(_value: string) {
		for (const listener of this.listeners) listener()
	}
}

describe('Artifact export', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(elementToPng).mockResolvedValue(new Blob(['png']))
		vi.mocked(elementToJpeg).mockResolvedValue(new Blob(['jpeg']))
		vi.stubGlobal('Image', StubImage)
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	it('Vector와 Video Artifact를 각각 SVG와 MP4로 변환한다', async () => {
		const vector: VectorSceneArtifact = {
			kind: 'vector',
			source: { width: 10, height: 20, background: '#000', primitives: [] },
		}
		const video: VideoArtifact<{
			canvas: HTMLCanvasElement
			renderFrame(timeSeconds: number, width: number, height: number): void
			restore(): void
		}> = {
			kind: 'video',
			source: {
				canvas: document.createElement('canvas'),
				renderFrame: vi.fn(),
				restore: vi.fn(),
			},
		}
		const request = {
			artifact: 'video',
			format: 'mp4',
			options: {
				container: 'mp4',
				codec: 'h264',
				durationSeconds: 5,
				fps: 30,
				width: 1920,
				height: 1080,
				colorSpace: 'rec709',
			},
		} as const

		expect(exportVectorArtifactAsSvg('graphic', vector, 300)).toMatchObject({
			filename: 'graphic.svg',
			mimeType: 'image/svg+xml',
		})
		await expect(exportVideoArtifactAsMp4('graphic', video, request)).resolves.toMatchObject({
			filename: 'graphic.mp4',
			mimeType: 'video/mp4',
		})
		expect(canvasFramesToMp4).toHaveBeenCalledOnce()
		expect(video.source.restore).toHaveBeenCalledOnce()
	})

	it('Template과 Image Raster Artifact를 같은 PNG leaf로 변환한다', async () => {
		const html = createTemplateRasterArtifact({
			html: '<div>card</div>',
			width: 600,
			height: 300,
		})
		const [element] = createImageArtifacts({ images: ['/image.png'], color: null }).raster
		if (!element) throw new Error('fixture artifact is missing')

		await expect(
			exportRasterArtifactAsPng('template', html, PNG_REQUEST),
		).resolves.toMatchObject({
			filename: 'template.png',
		})
		await expect(
			exportRasterArtifactAsPng('image', element, PNG_REQUEST),
		).resolves.toMatchObject({
			filename: 'image.png',
		})
		expect(elementToPng).toHaveBeenNthCalledWith(1, expect.any(HTMLElement), {
			width: 600,
			height: 300,
			...PNG_REQUEST.options,
		})
		expect(elementToPng).toHaveBeenNthCalledWith(2, expect.any(HTMLElement), {
			width: 2048,
			height: 3072,
			...PNG_REQUEST.options,
		})
	})

	it('Template Raster Artifact를 공통 JPEG leaf로 변환한다', async () => {
		const html = createTemplateRasterArtifact({
			html: '<div>card</div>',
			width: 600,
			height: 300,
		})

		await expect(
			exportRasterArtifactAsJpeg('template', html, JPEG_REQUEST),
		).resolves.toMatchObject({ filename: 'template.jpg', mimeType: 'image/jpeg' })
		expect(elementToJpeg).toHaveBeenCalledWith(expect.any(HTMLElement), {
			width: 600,
			height: 300,
			quality: 90,
			scale: 1,
		})
	})

	it('Canvas Raster Artifact를 PNG와 JPEG로 변환하고 preview를 복원한다', async () => {
		const canvas = document.createElement('canvas')
		const render = vi.fn()
		const toBlob = vi
			.spyOn(canvas, 'toBlob')
			.mockImplementation((callback, type) =>
				callback(new Blob([type ?? ''], { type: type ?? '' })),
			)
		const artifact = createGraphicRasterArtifact({
			canvas,
			getViewport: () => ({ width: 320, height: 240 }),
			render,
		})

		await expect(
			exportRasterArtifactAsPng('graphic', artifact, PNG_REQUEST, {
				width: 800,
				height: 600,
			}),
		).resolves.toMatchObject({ filename: 'graphic.png', mimeType: 'image/png' })
		await expect(
			exportRasterArtifactAsJpeg('graphic', artifact, JPEG_REQUEST, {
				width: 640,
				height: 480,
			}),
		).resolves.toMatchObject({ filename: 'graphic.jpg', mimeType: 'image/jpeg' })

		expect(render).toHaveBeenNthCalledWith(1, 800, 600)
		expect(render).toHaveBeenNthCalledWith(2, 320, 240)
		expect(render).toHaveBeenNthCalledWith(3, 640, 480)
		expect(render).toHaveBeenNthCalledWith(4, 320, 240)
		expect(toBlob).toHaveBeenNthCalledWith(1, expect.any(Function), 'image/png', undefined)
		expect(toBlob).toHaveBeenNthCalledWith(2, expect.any(Function), 'image/jpeg', 0.9)
	})

	it('인쇄 경로가 요청한 배율로 굽는다 — ppi는 픽셀을 한 개도 늘리지 않는다', async () => {
		// 🔴 여기 `scale: 1`이 하드코딩돼 있었다. 그래서 300ppi를 골라도 판이 캔버스 픽셀 그대로
		//    나갔고, A4 인쇄에 필요한 픽셀을 만들 경로가 아예 없었다.
		const artifact = createTemplateRasterArtifact({
			html: '<div>card</div>',
			width: 600,
			height: 300,
		})
		await executeArtifactExport({
			artifact,
			fileName: 'card',
			request: {
				artifact: 'raster',
				format: 'tiff',
				colorProfile: { space: 'cmyk', icc: 'cgats21-crpc6' },
				options: { ppi: 300, compression: 'lzw', scale: 4 },
			},
		})

		expect(elementToPng).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ width: 600, height: 300, scale: 4 }),
		)
	})

	it('같은 Raster Artifact를 Studio 구분 없이 인쇄와 정적 MP4로 변환한다', async () => {
		const canvas = document.createElement('canvas')
		vi.spyOn(canvas, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'])))
		const artifact = createGraphicRasterArtifact({
			canvas,
			getViewport: () => ({ width: 600, height: 300 }),
			render: vi.fn(),
		})
		await executeArtifactExport({
			artifact,
			fileName: 'asset',
			request: {
				artifact: 'raster',
				format: 'pdf',
				colorProfile: { space: 'cmyk', icc: 'cgats21-crpc6' },
				options: { ppi: 300, bleedMm: 0, scale: 1 },
			},
		})
		expect(requestPrintExport).toHaveBeenCalledWith(
			expect.objectContaining({ fileName: 'asset', format: 'pdf', ppi: 300 }),
		)

		await executeArtifactExport({
			artifact,
			fileName: 'asset',
			request: {
				artifact: 'raster',
				format: 'mp4',
				options: {
					container: 'mp4',
					codec: 'h264',
					colorSpace: 'rec709',
					durationSeconds: 1,
					fps: 24,
					width: 600,
					height: 300,
				},
			},
		})
		expect(canvasFramesToMp4).toHaveBeenCalled()
	})

	it('Original Artifact는 변환 없이 원본 Blob을 전달한다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				blob: () => Promise.resolve(new Blob(['original'], { type: 'image/png' })),
			}),
		)
		const [artifact] = createImageArtifacts({ images: ['/image.png'], color: null }).original
		if (!artifact) throw new Error('fixture artifact is missing')

		await expect(
			executeArtifactExport({
				artifact,
				fileName: '제품컷-굴착기-20260910-120000-01',
				request: { artifact: 'original', options: {} },
			}),
		).resolves.toMatchObject({
			filename: '제품컷-굴착기-20260910-120000-01.png',
			mimeType: 'image/png',
		})
		expect(elementToPng).not.toHaveBeenCalled()
	})
})
