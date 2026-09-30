import { describe, expect, it } from 'vitest'
import {
	cameraControlSchema,
	composeCameraAdjustmentPrompt,
	imageEffectivePromptSchema,
	resolveCameraControl,
} from './camera-control'

describe('resolveCameraControl', () => {
	it.each([
		[-180, 'rear'],
		[-157.5, 'rear-left'],
		[-112.5, 'left'],
		[-67.5, 'front-left'],
		[-22.5, 'front'],
		[22.5, 'front-right'],
		[67.5, 'right'],
		[112.5, 'rear-right'],
		[157.5, 'rear'],
		[180, 'rear'],
	] as const)('방위각 %d°를 %s 구간으로 해석한다', (azimuthDeg, azimuth) => {
		expect(resolveCameraControl({ azimuthDeg, elevationDeg: 0 }).azimuth).toBe(azimuth)
	})

	it.each([
		[-30, 'low'],
		[-10, 'eye-level'],
		[15, 'elevated'],
		[40, 'high'],
		[70, 'top-down'],
		[90, 'top-down'],
	] as const)('고도각 %d°를 %s 구간으로 해석한다', (elevationDeg, elevation) => {
		expect(resolveCameraControl({ azimuthDeg: 0, elevationDeg }).elevation).toBe(elevation)
	})
})

describe('cameraControlSchema', () => {
	it.each([
		[-180, -30],
		[180, 90],
		[0, 0],
	] as const)('경계 안 azimuthDeg %d°·elevationDeg %d°는 통과한다', (azimuthDeg, elevationDeg) => {
		expect(cameraControlSchema.safeParse({ azimuthDeg, elevationDeg }).success).toBe(true)
	})

	it.each([
		[-180.1, 0],
		[180.1, 0],
		[0, -30.1],
		[0, 90.1],
	] as const)('경계 밖 azimuthDeg %d°·elevationDeg %d°는 거부한다', (azimuthDeg, elevationDeg) => {
		expect(cameraControlSchema.safeParse({ azimuthDeg, elevationDeg }).success).toBe(false)
	})
})

describe('camera adjustment contract', () => {
	it('기존 시점보다 카메라 조정값을 우선하는 최종 프롬프트를 만든다', () => {
		const result = JSON.parse(
			composeCameraAdjustmentPrompt(
				JSON.stringify({
					camera: 'Isometric three-quarter view',
					composition: 'Centered composition',
					style: 'technical illustration',
					subject: '유조선',
				}),
				{ azimuth: 'front-right', elevation: 'elevated' },
			),
		)

		expect(result).toMatchObject({
			camera: 'front-right three-quarter view, slightly elevated camera angle',
			composition: 'Centered composition',
			style: 'technical illustration',
			subject: '유조선',
		})
		expect(result.camera_rules).toContain('overrides every previous camera angle')
	})

	it('저장된 effective prompt는 flat JSON만 허용한다', () => {
		expect(imageEffectivePromptSchema.safeParse('{"subject":"유조선"}').success).toBe(true)
		expect(imageEffectivePromptSchema.safeParse('not json').success).toBe(false)
	})
})
