export type LayoutParams = { sections: number; padding: number; gap: number; columns: number }
export type ImageSpec = { src: string; width: number; height: number }

/** 값은 원본 이미지 좌표다. 과한 패딩·갭으로 음수 셀이 생기지 않도록 이미지별로 제한한다. */
export function overlayGeometry(image: ImageSpec, params: LayoutParams) {
	const width = Math.max(1, image.width)
	const height = Math.max(1, image.height)
	const sections = Math.max(1, Math.min(12, Math.floor(params.sections)))
	const columns = Math.max(1, Math.min(12, Math.floor(params.columns)))
	const sectionHeight = height / sections
	const padding = Math.max(0, Math.min(params.padding, width / 2, sectionHeight / 2))
	const contentWidth = width - padding * 2
	const gap = columns > 1 ? Math.max(0, Math.min(params.gap, contentWidth / (columns - 1))) : 0
	return {
		width,
		height,
		sections,
		columns,
		sectionHeight,
		padding,
		gap,
		colWidth: (contentWidth - gap * (columns - 1)) / columns,
	}
}
