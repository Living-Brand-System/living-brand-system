'use client'

import { useEffect } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import {
	StudioSelectionCard,
	StudioSelectionTile,
} from '@/components/studio/shared/studio-selection-card'
import { graphicRendererLabel } from '@/features/graphic-generation/domain/graphic-studio-config'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'

/** Controller.Browser 본문에서 현재 Graphic 계약을 같은 편집 세션 안에서 교체한다. */
export function GraphicProfilePicker() {
	const { config, profiles } = useGraphicStudio()
	const { load } = profiles.browse
	// 이 컴포넌트는 패널이 열릴 때 마운트된다(radix가 닫힌 콘텐츠를 언마운트한다) — mount가 곧 "열림"이다.
	useEffect(() => {
		load()
	}, [load])

	return (
		<div data-slot="graphic-profile-picker" className="grid shrink-0 grid-cols-3 gap-3 pr-1">
			{(profiles.browse.data ?? []).map((option) => (
				<ControllerBrowser.Close key={option.id} asChild>
					<StudioSelectionTile
						aria-current={option.id === config.id || undefined}
						onClick={() => profiles.select(option.id)}
					>
						<StudioSelectionCard
							title={option.name}
							subtitle={graphicRendererLabel(option.type)}
							image={option.previewImage}
						/>
					</StudioSelectionTile>
				</ControllerBrowser.Close>
			))}
		</div>
	)
}
