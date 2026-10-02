'use client'

import { useEffect, useState } from 'react'
import { requestPublishedBrandColorPairs } from '@/features/template-core/services/template-editor-options.client'
import { isValidHex } from '@/lib/color'
import type { BrandColor, BrandColorPair } from '@/payload-types'

export type BrandColorPairSwatch = {
	id: string
	label: string
	foreground: string
	background: string
}

function hexOf(color: number | BrandColor | null | undefined): string | null {
	if (!color || typeof color === 'number' || !isValidHex(color.hex)) return null
	return (color.hex.startsWith('#') ? color.hex : `#${color.hex}`).toLowerCase()
}

/** 두 색이 모두 발행·해석된 조합만 스와치가 된다 — 한쪽이 비면 그 조합은 고를 수 없다. */
export function toBrandColorPairSwatches(pairs: readonly BrandColorPair[]): BrandColorPairSwatch[] {
	return pairs.flatMap((pair) => {
		const background = hexOf(pair.background)
		const foreground = hexOf(pair.foreground)
		return background && foreground
			? [{ id: `pair-${pair.id}`, label: pair.name, background, foreground }]
			: []
	})
}

/**
 * 스튜디오 듀오 컬러 스와치의 정본 — CMS `brand-color-pairs`다.
 * 🔴 아직 못 불러왔거나 실패하면 빈 배열이다. 하드코딩 목록으로 물러나지 않는다 — 정본 밖 조합이 다시 생긴다.
 */
export function usePublishedBrandColorPairs() {
	const [swatches, setSwatches] = useState<readonly BrandColorPairSwatch[]>([])
	useEffect(() => {
		const controller = new AbortController()
		void requestPublishedBrandColorPairs(controller.signal)
			.then((pairs) => setSwatches(toBrandColorPairSwatches(pairs)))
			.catch((error: unknown) => {
				if ((error as { name?: string }).name !== 'AbortError') setSwatches([])
			})
		return () => controller.abort()
	}, [])
	return swatches
}
