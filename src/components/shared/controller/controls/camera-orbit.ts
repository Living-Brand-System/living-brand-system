export function snapCameraAngle(value: number, steps: readonly number[], circular = false): number {
	return steps.reduce((nearest, step) => {
		const nearestDistance = cameraAngleDistance(value, nearest, circular)
		const stepDistance = cameraAngleDistance(value, step, circular)
		return stepDistance < nearestDistance ? step : nearest
	})
}

function cameraAngleDistance(left: number, right: number, circular: boolean) {
	const distance = Math.abs(left - right)
	const normalizedDistance = distance % 360
	return circular ? Math.min(normalizedDistance, 360 - normalizedDistance) : distance
}
