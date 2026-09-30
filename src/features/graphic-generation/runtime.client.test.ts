// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { isOriginHandleHit } from './graphic-runtimes/forward-straight/runtime.client'
import { createGraphicRasterArtifact } from './runtime/client/graphic-runtime.client'

describe('Forward Straight client runtime', () => {
	it('기준점 히트 영역 안에서만 드래그를 시작한다', () => {
		const origin = { x: 100, y: 100 }

		expect(isOriginHandleHit({ x: 112, y: 100 }, origin)).toBe(true)
		expect(isOriginHandleHit({ x: 113, y: 100 }, origin)).toBe(false)
	})

	it('Raster Artifact를 요청 해상도로 다시 그린 뒤 현재 preview 해상도를 복원한다', () => {
		const canvas = document.createElement('canvas')
		vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,frame')
		const viewport = { width: 640, height: 480 }
		const render = vi.fn((width: number, height: number) => {
			canvas.width = width
			canvas.height = height
		})
		const artifact = createGraphicRasterArtifact({
			canvas,
			getViewport: () => viewport,
			render,
		})

		const frame = artifact.source.withSurface({ width: 1920, height: 1080 }, (surface) =>
			surface.kind === 'canvas' ? surface.element.toDataURL() : '',
		)

		expect(frame).toBe('data:image/png;base64,frame')
		expect(render).toHaveBeenNthCalledWith(1, 1920, 1080)
		expect(render).toHaveBeenNthCalledWith(2, 640, 480)
		expect(canvas).toMatchObject({ width: 640, height: 480 })
	})

	it('캔버스가 아직 없어도 Artifact를 만들고, 캡처 시점에만 실패한다', () => {
		// 🔴 p5는 document가 load되기 전이면 setup을 미룬다(p5 1.x 생성자). mount 시점에 캔버스를
		//    요구하면 런타임이 통째로 실패해 내보내기·미리보기 갱신이 조용히 사라진다.
		let late: HTMLCanvasElement | null = null
		const artifact = createGraphicRasterArtifact({
			canvas: () => late,
			getViewport: () => ({ width: 100, height: 100 }),
			render: vi.fn(),
		})

		expect(artifact.kind).toBe('raster')
		expect(() => artifact.source.withSurface({}, () => 'x')).toThrow(
			'Canvas가 아직 준비되지 않았습니다.',
		)

		// setup이 뒤늦게 돌면 같은 Artifact가 그대로 동작한다.
		late = document.createElement('canvas')
		expect(artifact.source.withSurface({}, (surface) => surface.kind)).toBe('canvas')
	})

	it('Raster frame 읽기가 실패해도 preview를 복원한다', () => {
		const canvas = document.createElement('canvas')
		vi.spyOn(canvas, 'toDataURL').mockImplementation(() => {
			throw new Error('capture failed')
		})
		const render = vi.fn()
		const artifact = createGraphicRasterArtifact({
			canvas,
			getViewport: () => ({ width: 640, height: 480 }),
			render,
		})

		expect(() =>
			artifact.source.withSurface({ width: 1920, height: 1080 }, (surface) =>
				surface.kind === 'canvas' ? surface.element.toDataURL() : '',
			),
		).toThrow('capture failed')
		expect(render).toHaveBeenLastCalledWith(640, 480)
	})
})
