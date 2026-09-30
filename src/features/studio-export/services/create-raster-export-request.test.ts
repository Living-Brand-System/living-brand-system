import { describe, expect, it } from 'vitest'
import type { StudioOutputCapability } from '../studio-output'
import { createRasterExportRequest } from './create-raster-export-request'

const capability: StudioOutputCapability = {
	formats: ['mp4'],
	video: {
		mp4: {
			codec: 'h264',
			colorSpace: 'rec709',
			fps: [30],
			maxWidth: 4096,
			maxHeight: 4096,
			maxDurationSeconds: 10,
		},
	},
}

describe('createRasterExportRequest mp4', () => {
	it('H.264가 인코딩할 수 있도록 홀수 변을 1px 내린다', () => {
		const request = createRasterExportRequest('mp4', capability, { width: 630, height: 891 })

		expect(request?.options).toMatchObject({ width: 630, height: 890 })
	})

	it('이미 짝수인 해상도는 그대로 둔다', () => {
		const request = createRasterExportRequest('mp4', capability, { width: 1080, height: 1080 })

		expect(request?.options).toMatchObject({ width: 1080, height: 1080 })
	})
})

describe('createRasterExportRequest 배율', () => {
	const capability = {
		formats: ['png', 'jpeg', 'mp4'],
		video: {
			mp4: {
				codec: 'h264',
				colorSpace: 'rec709',
				fps: [30],
				maxWidth: 4000,
				maxHeight: 4000,
				maxDurationSeconds: 10,
			},
		},
	} as const

	it('MP4 프레임 크기에 배율을 곱하고 짝수로 내린다', () => {
		const request = createRasterExportRequest('mp4', capability, {
			width: 630,
			height: 891,
			scale: 2,
			fps: 30,
		})
		expect(request?.options).toMatchObject({ width: 1260, height: 1782 })
	})

	it('PNG·JPEG는 크기 대신 scale로 배율을 넘긴다', () => {
		const settings = { width: 630, height: 891, scale: 3 }
		expect(createRasterExportRequest('png', capability, settings)?.options).toMatchObject({
			scale: 3,
		})
		expect(createRasterExportRequest('jpeg', capability, settings)?.options).toMatchObject({
			scale: 3,
		})
	})

	it('배율을 주지 않으면 1배로 둔다', () => {
		const request = createRasterExportRequest('mp4', capability, {
			width: 631,
			height: 891,
			fps: 30,
		})
		expect(request?.options).toMatchObject({ width: 630, height: 890 })
	})
})

describe('인쇄 해상도 기본값', () => {
	// 🔴 목록의 첫 값(72)로 떨어지면 인쇄물이 조용히 4배 크게 나간다 — print-policy가 경고하는 자리다.
	it('해상도를 안 주면 표준값 300으로 간다 — 목록의 첫 값이 아니다', () => {
		const request = createRasterExportRequest(
			'tiff',
			{
				formats: ['tiff'],
				colorProfiles: { cmyk: ['cgats21-crpc6'] },
				print: { ppi: [72, 150, 300] },
			},
			{ width: 600, height: 300 },
		)

		expect(request?.format === 'tiff' && request.options.ppi).toBe(300)
	})

	it('표준값이 목록에 없으면 있는 것 중 가장 낮은 값으로 떨어진다', () => {
		const request = createRasterExportRequest(
			'tiff',
			{
				formats: ['tiff'],
				colorProfiles: { cmyk: ['cgats21-crpc6'] },
				print: { ppi: [72, 150] },
			},
			{ width: 600, height: 300 },
		)

		expect(request?.format === 'tiff' && request.options.ppi).toBe(72)
	})
})
