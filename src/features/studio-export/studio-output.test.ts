import { describe, expect, it } from 'vitest'
import { STUDIO_OUTPUT_FORMATS } from './export-contract'
import {
	parseStudioOutputCapability,
	projectStudioOutputPolicy,
	resolveMaxExportScale,
	resolveStudioArtifactOutputFormats,
	resolveStudioOutputCapability,
	resolveStudioOutputFormats,
	supportsStudioExportRequest,
} from './studio-output'

describe('resolveStudioOutputFormats', () => {
	it('Artifact를 Exporter 호환 형식으로 투영한 뒤 Admin 제한을 적용한다', () => {
		expect(
			resolveStudioArtifactOutputFormats({ raster: {}, vector: {} }, ['png', 'svg']),
		).toEqual(['png', 'svg'])
		expect(resolveStudioArtifactOutputFormats({ raster: {} }, undefined)).toEqual([
			'png',
			'jpeg',
			'tiff',
			'pdf',
			'mp4',
		])
		expect(() => resolveStudioArtifactOutputFormats({ raster: {} }, ['svg'])).toThrow(
			'지원하지 않는 output format',
		)
		expect(resolveStudioArtifactOutputFormats({ raster: {} }, ['tiff'])).toEqual(['tiff'])
	})

	it('Admin 제한이 없으면 Runtime 순서를 유지한다', () => {
		expect(resolveStudioOutputFormats(['svg', 'png'] as const, undefined)).toEqual([
			'svg',
			'png',
		])
	})

	it('Admin이 허용한 부분집합만 Runtime 순서로 남긴다', () => {
		expect(resolveStudioOutputFormats(['svg', 'png'] as const, ['png'])).toEqual(['png'])
		expect(resolveStudioOutputFormats(['svg'] as const, [])).toEqual([])
	})

	it('지원하지 않는 형식과 중복을 거부한다', () => {
		expect(() => resolveStudioOutputFormats(['svg'] as const, ['png'])).toThrow(
			'지원하지 않는 output format',
		)
		expect(() => resolveStudioOutputFormats(['svg'] as const, ['svg', 'svg'])).toThrow('중복')
		expect(() => resolveStudioOutputFormats(['svg'] as const, ['original'])).toThrow(
			'지원하지 않는 output format',
		)
	})
})

describe('StudioOutputCapability', () => {
	const capability = {
		formats: ['mp4'] as const,
		video: {
			mp4: {
				codec: 'h264' as const,
				colorSpace: 'rec709' as const,
				fps: [24, 30] as const,
				maxWidth: 1920,
				maxHeight: 1080,
				maxDurationSeconds: 10,
			},
		},
	}

	it('직렬화 가능한 MP4 범위와 요청을 검증한다', () => {
		expect(parseStudioOutputCapability(capability)).toBe(capability)
		expect(
			supportsStudioExportRequest(capability, {
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
			}),
		).toBe(true)
	})

	it('상한을 넘거나 양수가 아닌 영상 요청을 거부한다', () => {
		const request = {
			artifact: 'video' as const,
			format: 'mp4' as const,
			options: {
				container: 'mp4' as const,
				codec: 'h264' as const,
				durationSeconds: 11,
				fps: 30 as const,
				width: 0,
				height: 1080,
				colorSpace: 'rec709' as const,
			},
		}
		expect(supportsStudioExportRequest(capability, request)).toBe(false)
	})

	it('original은 format 목록이 아닌 별도 capability로 검증한다', () => {
		const request = { artifact: 'original' as const, options: {} }
		expect(supportsStudioExportRequest({ formats: [], original: true }, request)).toBe(true)
		expect(supportsStudioExportRequest({ formats: [] }, request)).toBe(false)
	})

	it('공통 정본 외 format은 parser에서 거부한다', () => {
		expect(STUDIO_OUTPUT_FORMATS).toEqual(['png', 'jpeg', 'tiff', 'pdf', 'svg', 'mp4'])
		expect(() => parseStudioOutputCapability({ formats: ['original'] })).toThrow(
			'지원하지 않는 output format',
		)
		expect(() => parseStudioOutputCapability({ formats: ['webp'] })).toThrow(
			'지원하지 않는 output format',
		)
	})

	it('건드리지 않아 빈 배열로 실체화된 allowedFormats는 좁히지 않는다', () => {
		// Payload가 hasMany를 []로 채우므로 이것이 admin에서 새 프로파일을 만든 기본 상태다.
		expect(projectStudioOutputPolicy({ allowedFormats: [] })).toEqual({})
		expect(
			resolveStudioOutputCapability(
				{ vector: {}, raster: {} },
				projectStudioOutputPolicy({ allowedFormats: [] }),
			).formats,
		).toEqual(resolveStudioOutputCapability({ vector: {}, raster: {} }, null).formats)
	})

	it('Runtime Artifact와 Admin 제한을 PPI·FPS·영상 상한까지 한 번에 계산한다', () => {
		const policy = projectStudioOutputPolicy({
			allowedFormats: ['pdf', 'mp4'],
			print: { allowedPpi: ['150'] },
			video: {
				allowedFps: ['30'],
				maxWidth: 1280,
				maxHeight: 720,
				maxDurationSeconds: 4,
			},
		})
		expect(resolveStudioOutputCapability({ raster: {} }, policy)).toMatchObject({
			formats: ['pdf', 'mp4'],
			print: { ppi: [150] },
			video: {
				mp4: {
					fps: [30],
					maxWidth: 1280,
					maxHeight: 720,
					maxDurationSeconds: 4,
				},
			},
		})
	})

	it('Admin은 Runtime 영상 상한을 넓힐 수 없다', () => {
		expect(() =>
			resolveStudioOutputCapability(
				{
					video: {
						fps: [24],
						maxWidth: 1280,
						maxHeight: 720,
						maxDurationSeconds: 5,
					},
				},
				{ allowedFormats: ['mp4'], video: { maxWidth: 1920 } },
			),
		).toThrow('Runtime보다 넓습니다')
	})
})

describe('resolveMaxExportScale', () => {
	it('H.264 한도 안에서 가장 큰 정수 배율을 준다', () => {
		// 630×891 → 4배 2520×3564는 35,234 매크로블록으로 Level 5.1 한도(36,864) 안이다.
		expect(resolveMaxExportScale(630, 891)).toBe(4)
		// 1260×1782는 2배가 같은 프레임이므로 2배까지만 간다.
		expect(resolveMaxExportScale(1260, 1782)).toBe(2)
		expect(resolveMaxExportScale(1920, 1080)).toBe(2)
	})

	it('이미 한도에 가까운 캔버스도 최소 1배는 보장한다', () => {
		expect(resolveMaxExportScale(4096, 4096)).toBe(1)
	})

	it('fps를 주면 초당 처리량 예산까지 본다', () => {
		// 630×891 4배는 35,234 매크로블록. 30fps면 1,057,020으로 MaxMBPS(2,073,600) 안이지만
		// 60fps면 2,114,040으로 넘는다 — 그 지점에서 3배로 내려온다.
		expect(resolveMaxExportScale(630, 891, 24)).toBe(4)
		expect(resolveMaxExportScale(630, 891, 30)).toBe(4)
		expect(resolveMaxExportScale(630, 891, 60)).toBe(3)
	})

	it('1920×1080 캔버스는 60fps에서도 2배 = 4K까지 간다', () => {
		// 3840×2160은 32,400 매크로블록, 60fps면 1,944,000으로 Level 5.2 예산 안이다.
		expect(resolveMaxExportScale(1920, 1080, 60)).toBe(2)
		expect(resolveMaxExportScale(1920, 1080, 30)).toBe(2)
	})

	it('fps를 주지 않으면 프레임 크기 예산만 본다 — 시간축 없는 PNG·JPEG용이다', () => {
		expect(resolveMaxExportScale(630, 891)).toBe(4)
	})
})
