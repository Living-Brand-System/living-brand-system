'use client'

import { useEffect, useState } from 'react'
import { requestPublishedBrandColors } from '@/features/template-core/services/template-editor-options.client'
import { isValidHex } from '@/lib/color'

/**
 * 벡터 레이어가 고를 수 있는 색의 **도메인** — 브랜드가 선언한 팔레트 그 자체다(사용자 지시, 2026-09-29).
 * 템플릿이 색을 자의로 정하는 자리가 아니므로 admin 편집기와 스튜디오가 같은 목록을 본다.
 *
 * 🔴 아직 못 불러왔거나 실패하면 **빈 배열**이다. 호출부는 그때 고르지 못하게 막아야 한다 —
 *    빈 목록을 「제한 없음」으로 읽으면 네이티브 피커가 열려 정본 밖 색이 그대로 나간다.
 */
export function usePublishedBrandColorValues() {
	const [values, setValues] = useState<readonly string[]>([])
	const [loadError, setLoadError] = useState(false)

	useEffect(() => {
		const controller = new AbortController()
		void requestPublishedBrandColors(controller.signal)
			.then((colors) =>
				setValues(
					colors
						.filter((color) => isValidHex(color.hex))
						.map((color) => (color.hex.startsWith('#') ? color.hex : `#${color.hex}`)),
				),
			)
			.catch((error: unknown) => {
				if ((error as { name?: string }).name !== 'AbortError') setLoadError(true)
			})
		return () => controller.abort()
	}, [])

	return { values, loadError }
}
