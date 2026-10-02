'use client'

import { useEffect } from 'react'
import {
	type StudioProfileCard,
	StudioProfileCards,
} from '@/components/studio/shared/studio-profile-cards'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

/** Controller.Browser 본문에서 현재 Graphic 계약을 같은 편집 세션 안에서 교체한다. */
export function GraphicProfilePicker() {
	const { config, profiles } = useGraphicStudio()
	const { load } = profiles.browse
	// 이 컴포넌트는 패널이 열릴 때 마운트된다(radix가 닫힌 콘텐츠를 언마운트한다) — mount가 곧 "열림"이다.
	useEffect(() => {
		load()
	}, [load])

	return (
		<StudioProfileCards
			slot="graphic-profile-picker"
			cards={(profiles.browse.data ?? []).map(graphicProfileCard)}
			currentId={config.id}
			onSelect={(id) => profiles.select(String(id))}
		/>
	)
}

/** 그래픽 카드의 배지는 렌더러 종류다. 템플릿 배경의 그래픽 변경도 같은 카드를 쓴다. */
export const graphicProfileCard = (option: {
	id: string
	name: string
	type: string
	previewImage?: StudioPreviewImage
}): StudioProfileCard => ({
	id: option.id,
	name: option.name,
	image: option.previewImage,
	badges: [option.type.toUpperCase()],
})
