'use client'

import { useEffect } from 'react'
import {
	type StudioProfileCard,
	StudioProfileCards,
} from '@/components/studio/shared/studio-profile-cards'
import {
	getImageStudioFeature,
	type ImageStudioConfig,
} from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'

/**
 * 배지는 장식이 아니라 그 프로파일이 무엇을 열어주는지의 표시다 — 계약의 개방 필드에서만 파생한다.
 * 새 필드를 만들지 않으므로 어드민이 개방을 바꾸면 배지가 따라 바뀐다.
 */
function profileBadges(option: ImageStudioConfig): string[] {
	return [
		...(getImageStudioFeature(option, 'camera-control') ? ['Camera'] : []),
		...(getImageStudioFeature(option, 'color-adjustment') ? ['Line Control'] : []),
	]
}

/**
 * 자산 브라우저 본문의 이미지 프로파일 카드 그리드(`StudioProfileCards`) — 컨텍스트의 교체 후보와 현재 계약만 읽고,
 * 카드를 고르면 프로파일을 교체한다.
 */
export function ImageProfilePicker() {
	const { config, profiles } = useImageStudio()
	const { load } = profiles.browse
	// 이 컴포넌트는 패널이 열릴 때 마운트된다(radix가 닫힌 콘텐츠를 언마운트한다) — mount가 곧 "열림"이다.
	// 실패했다면 다시 열 때 재시도된다.
	useEffect(() => {
		load()
	}, [load])

	return (
		<StudioProfileCards
			slot="image-profile-picker"
			cards={(profiles.browse.data ?? []).map(imageProfileCard)}
			currentId={config.id}
			onSelect={(id) => profiles.select(Number(id))}
		/>
	)
}

/** 템플릿 이미지 슬롯·배경의 프로파일 변경도 같은 카드를 쓴다. */
export const imageProfileCard = (option: ImageStudioConfig): StudioProfileCard => ({
	id: option.id,
	name: option.name,
	image: option.previewImage,
	badges: profileBadges(option),
})
