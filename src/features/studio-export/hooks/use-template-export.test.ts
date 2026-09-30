// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	createTemplateRasterArtifact,
	type TemplateVideoArtifact,
} from '@/features/template-customization/runtime/template-runtime.client'
import { executeArtifactExport } from '../services/export-artifact.client'
import { useTemplateExport } from './use-template-export'

vi.mock('../adapters/download-export-result.client', () => ({
	downloadExportResult: vi.fn(),
}))
vi.mock('../services/export-artifact.client', () => ({
	executeArtifactExport: vi.fn().mockResolvedValue({
		data: new Blob(['pdf']),
		filename: 'card.pdf',
		mimeType: 'application/pdf',
	}),
}))

describe('useTemplateExport', () => {
	beforeEach(() => {
		vi.mocked(executeArtifactExport).mockClear()
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(new Date('2026-09-10T03:00:00Z'))
	})
	afterEach(() => vi.useRealTimers())

	it('Template은 Raster Artifact와 공통 Print request만 executor에 전달한다', async () => {
		const artifact = createTemplateRasterArtifact({
			html: '<div>card</div>',
			width: 600,
			height: 300,
		})
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () => artifact,
				capability: {
					formats: ['pdf'],
					colorProfiles: { cmyk: ['cgats21-crpc6'] },
					print: { ppi: [300] },
				},
				metadata: {
					fileName: 'card',
					width: 600,
					height: 300,
					maxScale: 1,
					controller: { groups: [], values: {} },
				},
			}),
		)

		act(() => result.current.run())
		await waitFor(() => expect(executeArtifactExport).toHaveBeenCalledOnce())
		expect(executeArtifactExport).toHaveBeenCalledWith(
			expect.objectContaining({
				artifact,
				fileName: 'card-20260910-120000',
				request: expect.objectContaining({ artifact: 'raster', format: 'pdf' }),
			}),
		)
	})

	it('벡터가 있으면 PDF를 벡터 경로로 보내고 못 옮긴 것을 경고로 남긴다', async () => {
		const vector = {
			artifact: {
				kind: 'vector',
				source: { width: 600, height: 300, background: '#ffffff', primitives: [] },
			},
			diagnostics: {
				unsupported: [{ nodeId: 'hero', reason: 'box-shadow' }],
				notOutlined: [
					{ text: 'Bold', fontFamily: 'Pretendard', reason: 'variable-weight' },
				],
			},
		} as const
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () =>
					createTemplateRasterArtifact({
						html: '<div>card</div>',
						width: 600,
						height: 300,
					}),
				vectorArtifact: async () => vector,
				capability: {
					formats: ['pdf'],
					colorProfiles: { cmyk: ['cgats21-crpc6'] },
					print: { ppi: [300] },
				},
				metadata: {
					fileName: 'card',
					width: 600,
					height: 300,
					maxScale: 1,
					controller: { groups: [], values: {} },
				},
			}),
		)

		act(() => result.current.run())
		await waitFor(() => expect(executeArtifactExport).toHaveBeenCalledOnce())
		// 판 전체를 굽는 래스터 PDF가 아니라 도형을 싣는 벡터 PDF로 가야 한다.
		expect(executeArtifactExport).toHaveBeenCalledWith(
			expect.objectContaining({
				artifact: vector.artifact,
				request: expect.objectContaining({ artifact: 'vector', format: 'pdf' }),
			}),
		)
		await waitFor(() => expect(result.current.vectorWarnings).toHaveLength(2))
		expect(result.current.vectorWarnings[0]).toContain('그림자')
		expect(result.current.vectorWarnings[1]).toContain('Pretendard')
	})

	const MP4_CAPABILITY = {
		formats: ['mp4'],
		video: {
			mp4: {
				codec: 'h264',
				colorSpace: 'rec709',
				fps: [30],
				maxWidth: 1920,
				maxHeight: 1080,
				maxDurationSeconds: 10,
			},
		},
	} as const
	const MP4_METADATA = {
		fileName: 'card',
		width: 600,
		height: 300,
		maxScale: 1,
		controller: { groups: [], values: {} },
	}

	it('시간축이 있으면 MP4를 Video Artifact로 돌린다', async () => {
		const video = { kind: 'video', source: {} } as unknown as TemplateVideoArtifact
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () =>
					createTemplateRasterArtifact({
						html: '<div>card</div>',
						width: 600,
						height: 300,
					}),
				videoArtifact: async () => video,
				capability: MP4_CAPABILITY,
				metadata: MP4_METADATA,
			}),
		)

		act(() => result.current.run())
		await waitFor(() => expect(executeArtifactExport).toHaveBeenCalledOnce())
		expect(executeArtifactExport).toHaveBeenCalledWith(
			expect.objectContaining({
				artifact: video,
				request: expect.objectContaining({ artifact: 'video', format: 'mp4' }),
			}),
		)
	})

	it('배율을 올리면 Video Artifact를 그 프레임 크기로 만든다', async () => {
		// 전경 오버레이는 producer가 받은 크기로 한 번 구워진다 — 배율을 안 넘기면 텍스트가 늘어난다.
		const video = { kind: 'video', source: {} } as unknown as TemplateVideoArtifact
		const produce = vi.fn(async () => video)
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () =>
					createTemplateRasterArtifact({
						html: '<div>card</div>',
						width: 600,
						height: 300,
					}),
				videoArtifact: produce,
				capability: MP4_CAPABILITY,
				metadata: { ...MP4_METADATA, maxScale: 2 },
			}),
		)

		act(() => result.current.setScale(2))
		act(() => result.current.run())
		await waitFor(() => expect(produce).toHaveBeenCalledOnce())
		expect(produce).toHaveBeenCalledWith({ width: 1200, height: 600 })
		expect(result.current.outputSize).toEqual({ width: 1200, height: 600 })
	})

	it('허용 배율을 넘는 값은 무시하고 1배로 둔다', () => {
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () =>
					createTemplateRasterArtifact({
						html: '<div>card</div>',
						width: 600,
						height: 300,
					}),
				videoArtifact: null,
				capability: MP4_CAPABILITY,
				metadata: MP4_METADATA,
			}),
		)

		// MP4는 인코더 예산에 걸린다 — 이 캔버스는 1배가 상한이다.
		expect(result.current.scaleOptions).toEqual([1])
		act(() => result.current.setScale(3))
		expect(result.current.scale).toBe(1)
	})

	it('인쇄 형식에도 배율이 그대로 먹는다', () => {
		// 🔴 예전에는 TIFF·PDF가 배율을 버려서, 어떤 해상도를 골라도 캔버스 픽셀 그대로 나갔다.
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () =>
					createTemplateRasterArtifact({
						html: '<div>card</div>',
						width: 600,
						height: 300,
					}),
				videoArtifact: null,
				capability: {
					formats: ['pdf'],
					colorProfiles: { cmyk: ['cgats21-crpc6'] },
					print: { ppi: [300] },
				},
				metadata: { ...MP4_METADATA, maxScale: 4 },
			}),
		)

		act(() => result.current.setScale(4))
		expect(result.current.scaleApplies).toBe(true)
		expect(result.current.outputSize).toEqual({ width: 2400, height: 1200 })
		// 인쇄 배율 상한은 영상 예산이 아니라 캔버스·총 픽셀이 정한다 — 4배를 훨씬 넘겨 갈 수 있다.
		expect(result.current.scaleOptions.length).toBeGreaterThan(4)
	})

	it('MP4 Size는 짝수 내림까지 거친 실제 프레임 크기를 안내한다', () => {
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () =>
					createTemplateRasterArtifact({
						html: '<div>card</div>',
						width: 601,
						height: 301,
					}),
				videoArtifact: null,
				capability: MP4_CAPABILITY,
				metadata: { ...MP4_METADATA, width: 601, height: 301, maxScale: 1 },
			}),
		)

		expect(result.current.outputSize).toEqual({ width: 600, height: 300 })
	})

	it('fps를 올리면 MP4가 갈 수 있는 배율이 줄고 고른 값도 따라 붙는다', () => {
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () =>
					createTemplateRasterArtifact({
						html: '<div>card</div>',
						width: 630,
						height: 891,
					}),
				videoArtifact: null,
				capability: {
					...MP4_CAPABILITY,
					video: { mp4: { ...MP4_CAPABILITY.video.mp4, fps: [24, 30, 60] } },
				},
				metadata: { ...MP4_METADATA, width: 630, height: 891, maxScale: 4 },
			}),
		)

		act(() => result.current.setFps(24))
		expect(result.current.scaleOptions).toEqual([1, 2, 3, 4])

		act(() => result.current.setScale(4))
		expect(result.current.scale).toBe(4)

		// 60fps로 올리면 4배는 초당 처리량 예산을 넘는다 — 1로 떨어지지 않고 3으로 붙는다.
		act(() => result.current.setFps(60))
		expect(result.current.scaleOptions).toEqual([1, 2, 3])
		expect(result.current.scale).toBe(3)
	})

	it('PNG는 영상 예산이 아니라 인쇄·캔버스 한도까지 커진다', () => {
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () =>
					createTemplateRasterArtifact({
						html: '<div>card</div>',
						width: 630,
						height: 891,
					}),
				videoArtifact: null,
				capability: { formats: ['png'], colorProfiles: { rgb: ['srgb'] } },
				metadata: { ...MP4_METADATA, width: 630, height: 891, maxScale: 4 },
			}),
		)

		// 🔴 정지 이미지에 H.264 매크로블록 예산을 씌우면 A4 300ppi가 막힌다.
		expect(result.current.scaleOptions.length).toBeGreaterThan(4)
	})

	it('시간축이 없어도 MP4는 Raster Artifact로 반드시 나온다', async () => {
		const raster = createTemplateRasterArtifact({
			html: '<div>card</div>',
			width: 600,
			height: 300,
		})
		const { result } = renderHook(() =>
			useTemplateExport({
				artifact: () => raster,
				videoArtifact: null,
				capability: MP4_CAPABILITY,
				metadata: MP4_METADATA,
			}),
		)

		expect(result.current.canExportFormat('mp4')).toBe(true)
		act(() => result.current.run())
		await waitFor(() => expect(executeArtifactExport).toHaveBeenCalledOnce())
		expect(executeArtifactExport).toHaveBeenCalledWith(
			expect.objectContaining({
				artifact: raster,
				request: expect.objectContaining({ artifact: 'raster', format: 'mp4' }),
			}),
		)
	})

	describe('판형 선언', () => {
		// 🔑 템플릿은 판형이 문서에 선언돼 있어 창작자가 크기도 밀도도 고르지 않는다.
		it('판형이 선언된 인쇄판은 mm가 고정이고 배율·해상도를 고르지 않는다', () => {
			const { result } = renderHook(() =>
				useTemplateExport({
					artifact: () =>
						createTemplateRasterArtifact({
							html: '<div>poster</div>',
							width: 2480,
							height: 3508,
						}),
					videoArtifact: null,
					capability: {
						formats: ['pdf'],
						colorProfiles: { cmyk: ['cgats21-crpc6'] },
						print: { ppi: [300] },
					},
					metadata: {
						...MP4_METADATA,
						width: 2480,
						height: 3508,
						maxScale: 4,
						canvasPpi: 300,
					},
				}),
			)

			expect(result.current.scaleApplies).toBe(false)
			expect(result.current.ppiApplies).toBe(false)
			expect(Math.round(result.current.sizeMm?.width ?? 0)).toBe(210)
			expect(Math.round(result.current.sizeMm?.height ?? 0)).toBe(297)

			// 🔴 배율을 밀어 넣어도 선언한 판이 커지지 않는다.
			//    2는 이 판의 배율 상한 안이라 실제로 적용될 수 있는 값이다 — 상한 밖 값(4)을 쓰면
			//    애초에 무시돼 「선언이 배율을 막는다」를 검증하지 못한다.
			expect(result.current.scaleOptions).toContain(2)
			act(() => result.current.setScale(2))
			expect(result.current.outputSize).toEqual({ width: 2480, height: 3508 })
		})

		it('선언이 없으면 디지털판이라 배율과 해상도를 창작자가 고른다', () => {
			const { result } = renderHook(() =>
				useTemplateExport({
					artifact: () =>
						createTemplateRasterArtifact({
							html: '<div>card</div>',
							width: 600,
							height: 300,
						}),
					videoArtifact: null,
					capability: {
						formats: ['pdf'],
						colorProfiles: { cmyk: ['cgats21-crpc6'] },
						print: { ppi: [300] },
					},
					metadata: { ...MP4_METADATA, maxScale: 4 },
				}),
			)

			expect(result.current.scaleApplies).toBe(true)
			expect(result.current.ppiApplies).toBe(true)
			expect(result.current.sizeMm).toBeNull()
		})
	})
})
