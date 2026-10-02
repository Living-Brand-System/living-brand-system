/** RGBA 픽셀의 평균색 — 투명한 픽셀은 알파만큼만 센다. 전부 투명하면 null. */
export function averagePixelColor(data: Uint8ClampedArray): string | null {
	let r = 0
	let g = 0
	let b = 0
	let weight = 0
	for (let index = 0; index < data.length; index += 4) {
		const alpha = data[index + 3] / 255
		r += data[index] * alpha
		g += data[index + 1] * alpha
		b += data[index + 2] * alpha
		weight += alpha
	}
	if (weight === 0) return null
	const hex = (sum: number) =>
		Math.round(sum / weight)
			.toString(16)
			.padStart(2, '0')
	return `#${hex(r)}${hex(g)}${hex(b)}`
}

const SAMPLE_SIZE = 24

export function sampleAverageColor(image: HTMLImageElement): string | null {
	const canvas = document.createElement('canvas')
	canvas.width = SAMPLE_SIZE
	canvas.height = SAMPLE_SIZE
	const context = canvas.getContext('2d', { willReadFrequently: true })
	if (!context) return null
	context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
	try {
		return averagePixelColor(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data)
	} catch {
		// 다른 출처의 이미지는 캔버스가 오염돼 읽을 수 없다 — 기본 표면으로 남는다.
		return null
	}
}
