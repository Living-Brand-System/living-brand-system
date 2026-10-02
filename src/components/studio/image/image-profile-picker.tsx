'use client'

import { Fragment, useEffect } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import {
	StudioSelectionCard,
	StudioSelectionTile,
} from '@/components/studio/shared/studio-selection-card'
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

/** 카드 부제 줄에 배지를 ` · `로 잇는다 — 배지마다 따로 읽히도록 낱낱의 span으로 둔다. */
function BadgeLine({ badges }: { badges: readonly string[] }) {
	return badges.map((badge, index) => (
		<Fragment key={badge}>
			{index > 0 && ' · '}
			<span>{badge}</span>
		</Fragment>
	))
}

/**
 * 자산 브라우저 본문의 이미지 프로파일 카드 그리드 — 킷(Controller.Browser)이 크롬을, 이 컴포넌트가 도메인을 갖는다.
 * 컨텍스트의 교체 후보와 현재 계약만 읽고, 카드를 고르면 프로파일을 교체한다.
 * 카드는 홈·편집 화면 좌상단과 같은 `StudioSelectionCard`다.
 * 고른 뒤 닫기는 카드를 감싼 Controller.Browser.Close가 받는다 — 열림 상태는 킷이 소유한다.
 * 디자인 SSOT: Figma HD_LBS_UI node 19:12907.
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
		<div data-slot="image-profile-picker" className="grid shrink-0 grid-cols-3 gap-3 pr-1">
			{(profiles.browse.data ?? []).map((option) => (
				<ControllerBrowser.Close key={option.id} asChild>
					<StudioSelectionTile
						aria-current={option.id === config.id || undefined}
						onClick={() => profiles.select(option.id)}
					>
						<StudioSelectionCard
							title={option.name}
							subtitle={
								profileBadges(option).length > 0 && (
									<BadgeLine badges={profileBadges(option)} />
								)
							}
							image={option.previewImage}
						/>
					</StudioSelectionTile>
				</ControllerBrowser.Close>
			))}
		</div>
	)
}
