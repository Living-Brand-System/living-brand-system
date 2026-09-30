import { describe, expect, it } from 'vitest'
import { acceptsExportArtifact, EXPORTER_ARTIFACT_COMPATIBILITY } from './export-artifact'
import { STUDIO_OUTPUT_FORMATS } from './export-contract'

describe('EXPORTER_ARTIFACT_COMPATIBILITY', () => {
	it('모든 출력 형식을 하나의 호환성 정본에서 정의한다', () => {
		expect(Object.keys(EXPORTER_ARTIFACT_COMPATIBILITY)).toEqual(STUDIO_OUTPUT_FORMATS)
		expect(EXPORTER_ARTIFACT_COMPATIBILITY).toEqual({
			png: { artifacts: ['raster'] },
			jpeg: { artifacts: ['raster'] },
			tiff: { artifacts: ['raster'] },
			pdf: { artifacts: ['vector', 'raster'] },
			svg: { artifacts: ['vector'] },
			mp4: { artifacts: ['video', 'raster'] },
		})
	})

	it('format과 artifact kind의 호환 여부를 판정한다', () => {
		expect(acceptsExportArtifact('png', 'raster')).toBe(true)
		expect(acceptsExportArtifact('png', 'vector')).toBe(false)
		expect(acceptsExportArtifact('tiff', 'raster')).toBe(true)
		expect(acceptsExportArtifact('svg', 'raster')).toBe(false)
		expect(acceptsExportArtifact('mp4', 'video')).toBe(true)
		expect(acceptsExportArtifact('mp4', 'raster')).toBe(true)
	})
})
