import { DEFAULT_CMYK_ICC_PROFILE } from '../color-profile'
import type { ExportRequest, StudioOutputFormat, VideoExportSpec } from '../export-contract'
import { type PrintPpi, resolveDefaultPrintPpi } from '../print-policy'
import { acceptsPrintPpi, type StudioOutputCapability } from '../studio-output'

export type RasterExportSettings = {
	width: number
	height: number
	/** 캔버스 좌표계 대비 출력 배율. 벡터·텍스트는 이 배율로 다시 래스터화된다. */
	scale?: number
	ppi?: PrintPpi
	fps?: VideoExportSpec['fps']
	durationSeconds?: number
}

/** Effective output capability와 현재 설정을 완전한 Raster ExportRequest로 정규화한다. */
export function createRasterExportRequest(
	format: StudioOutputFormat,
	capability: StudioOutputCapability,
	settings: RasterExportSettings,
): Extract<ExportRequest, { artifact: 'raster' }> | null {
	if (!capability.formats.includes(format)) return null
	const scale = settings.scale ?? 1
	switch (format) {
		case 'png':
			return {
				artifact: 'raster',
				format,
				colorProfile: { space: 'rgb', icc: capability.colorProfiles?.rgb?.[0] ?? 'srgb' },
				options: { scale, transparent: true },
			}
		case 'jpeg':
			return {
				artifact: 'raster',
				format,
				colorProfile: { space: 'rgb', icc: capability.colorProfiles?.rgb?.[0] ?? 'srgb' },
				options: { quality: 90, scale },
			}
		case 'tiff':
		case 'pdf': {
			// 🔴 목록의 첫 값을 폴백으로 쓰면 72ppi로 떨어져 인쇄물이 조용히 4배 크게 나간다.
			const ppi = settings.ppi ?? resolveDefaultPrintPpi(capability.print?.ppi)
			if (!acceptsPrintPpi(capability, ppi)) return null
			const colorProfile = {
				space: 'cmyk' as const,
				icc: capability.colorProfiles?.cmyk?.[0] ?? DEFAULT_CMYK_ICC_PROFILE,
			}
			return format === 'tiff'
				? {
						artifact: 'raster',
						format,
						colorProfile,
						options: { ppi, compression: 'lzw', scale },
					}
				: { artifact: 'raster', format, colorProfile, options: { ppi, bleedMm: 0, scale } }
		}
		case 'mp4': {
			const video = capability.video?.mp4
			const fps = settings.fps ?? video?.fps[0]
			if (!video || !fps) return null
			return {
				artifact: 'raster',
				format,
				options: {
					container: 'mp4',
					codec: video.codec,
					colorSpace: video.colorSpace,
					width: toEvenDimension(settings.width * scale),
					height: toEvenDimension(settings.height * scale),
					fps,
					durationSeconds:
						settings.durationSeconds ?? Math.min(5, video.maxDurationSeconds),
				},
			}
		}
		case 'svg':
			return null
	}
}

/**
 * H.264 4:2:0은 짝수 해상도만 인코딩하므로 홀수 변을 1px 내린다.
 * 여기서 한 번 맞춰 두 MP4 export 경로가 인코더 질의와 canvas를 같은 값으로 만든다.
 */
function toEvenDimension(value: number): number {
	return value - (value % 2)
}
