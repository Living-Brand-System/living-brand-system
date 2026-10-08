import { describe, expect, it } from 'vitest'
import { snapCameraAngle } from './camera-orbit'

describe('CameraOrbitControl snapCameraAngle', () => {
	it('방위각 경계를 순환시키고 높이는 가장 가까운 프리셋에 맞춘다', () => {
		expect(snapCameraAngle(-179, [0, 45, 90, 135, 180, -135, -90, -45], true)).toBe(180)
		expect(snapCameraAngle(17, [-20, 0, 20, 50, 80])).toBe(20)
	})
})
