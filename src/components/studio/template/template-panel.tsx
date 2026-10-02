'use client'

import { useEffect } from 'react'
import type {
	ControlPanelComposition,
	ControlPanelExtras,
} from '@/components/studio/shared/control-panel'
import type { StudioSurface } from '@/components/studio/shared/studio-shell'
import { buildTemplateBackgroundComposition } from '@/components/studio/template/template-background-composition'
import {
	buildTemplateLayerPanel,
	useTextCaretHandoff,
} from '@/components/studio/template/template-layer-composition'
import {
	buildTemplateGraphicPanel,
	buildTemplateImagePanel,
} from '@/components/studio/template/template-media-controls'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/** 편집 대상 하나의 패널 — 대상별 빌더(순수 함수)가 낸다. 컴포지션이 없으면 그 대상은 공통 것만 선다. */
export type TemplateTargetPanel = {
	composition: ControlPanelComposition | null
	extras?: ControlPanelExtras
}

/**
 * 템플릿의 패널 모델 — 선택한 대상(레이어·배경 방식)에 맞는 빌더를 고른다(docs/10 §3.7 공통 셸).
 * 🔑 대상이 바뀌어도 **값만 바뀐다** — 화면 갈래가 없으므로 셸의 패널·레일·고정 카드·자산 브라우저가 같은 DOM으로 남는다.
 * 오른쪽 패널(`panel`)과 왼쪽 설정 카드(`settings`)가 이 한 번의 계산을 함께 쓴다.
 */
export function useTemplatePanel(): {
	panel: StudioSurface['panel']
	settings: ControlPanelComposition | null
} {
	const studio = useTemplateStudio()
	const { config, layers, background, focus, sampleImages } = studio
	const kind = config.template.slots.find((slot) => slot.id === layers.selectedId)?.kind
	useTextCaretHandoff(focus.target)
	// 샘플 목록(Preset 카드)은 이미지 대상일 때만 필요하다 — 패널이 하나라 여기서 한 번 연다.
	const needsSamples =
		kind === 'image' || (kind === 'background' && background.state.type === 'image')
	useEffect(() => {
		if (needsSamples) sampleImages.load()
	}, [needsSamples, sampleImages.load])

	const shared = kind === 'background' ? buildTemplateBackgroundComposition(studio) : null
	const own: TemplateTargetPanel =
		kind === 'text' || kind === 'vector'
			? buildTemplateLayerPanel(kind, studio)
			: kind === 'image'
				? buildTemplateImagePanel(studio, false)
				: kind === 'background' && background.state.type === 'graphic'
					? buildTemplateGraphicPanel(studio)
					: kind === 'background' && background.state.type === 'image'
						? buildTemplateImagePanel(studio, true)
						: { composition: null }
	return {
		panel: {
			identity: config.id,
			target: layers.selectedId ?? 'none',
			// 자리마다 대상 자기 것이 먼저, 배경 공통(Dimming·색)이 그다음이다.
			compositions: [own.composition, shared].filter(
				(item): item is ControlPanelComposition => item !== null,
			),
			extras: own.extras,
		},
		// 방식 행 — 배경은 배경 공통이, 이미지 슬롯은 자기 컴포지션이 갖는다.
		settings: kind === 'background' ? shared : kind === 'image' ? own.composition : null,
	}
}
