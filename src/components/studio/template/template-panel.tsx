'use client'

import { useEffect } from 'react'
import type {
	ControlPanelComposition,
	ControlPanelExtras,
} from '@/components/studio/panel/control-panel'
import type { StudioFloating } from '@/components/studio/shared/studio-floating-layer'
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
import { Button } from '@/components/ui/button'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/** 편집 대상 하나의 패널 — 대상별 빌더(순수 함수)가 낸다. 컴포지션이 없으면 그 대상은 공통 것만 선다. */
export type TemplateTargetPanel = {
	composition: ControlPanelComposition | null
	extras?: ControlPanelExtras
}

/** 패널이 서는 층 — 기본 층(늘 보이는 오른쪽 패널) 또는 플로팅 층(프로파일 조정). */
export type TemplatePanelLayer = 'base' | 'floating'

/**
 * 템플릿의 패널 모델 — 선택한 대상(레이어·배경 방식)에 맞는 빌더를 고른다(docs/10 §3.7 공통 셸).
 * 🔑 대상이 바뀌어도 **값만 바뀐다** — 화면 갈래가 없으므로 셸의 패널·레일·고정 카드·자산 브라우저가 같은 DOM으로 남는다.
 * 🔑 두 층은 섞이지 않는다(사용자 2026-10-16) — 기본 층(`panel`)은 프로파일 밖의 값과 「프로파일 조정」 버튼,
 *    플로팅 층(`floating`)은 프로파일 값만 갖는다. 플로팅 층이 열려도 기본 층은 바뀌지 않고 뒤로 밀릴 뿐이다.
 * 왼쪽 설정 카드(`settings`)는 플로팅 층의 왼쪽 카드가 쓴다.
 */
export function useTemplatePanel(): {
	panel: StudioSurface['panel']
	settings: ControlPanelComposition | null
	floating: NonNullable<StudioFloating['panel']> | null
} {
	const studio = useTemplateStudio()
	const { config, layers, background, focus, sampleImages, editing } = studio
	const selected = config.template.slots.find((slot) => slot.id === layers.selectedId)
	const kind = selected?.kind
	useTextCaretHandoff(focus.target)
	// 샘플 목록(Preset 카드)은 이미지 대상일 때만 필요하다 — 패널이 하나라 여기서 한 번 연다.
	const needsSamples =
		kind === 'image' || (kind === 'background' && background.state.type === 'image')
	useEffect(() => {
		if (needsSamples) sampleImages.load()
	}, [needsSamples, sampleImages.load])

	const shared = kind === 'background' ? buildTemplateBackgroundComposition(studio) : null
	const base: TemplateTargetPanel =
		kind === 'text' || kind === 'vector'
			? buildTemplateLayerPanel(kind, studio)
			: kind === 'image'
				? buildTemplateImagePanel(studio, false, 'base')
				: { composition: null }
	// 편집 중에는 다른 레이어를 고를 수 없으므로 선택한 대상이 곧 플로팅 층의 대상이다.
	const floating: TemplateTargetPanel | null = !editing.targetId
		? null
		: kind === 'image'
			? buildTemplateImagePanel(studio, false, 'floating')
			: kind === 'background' && background.state.type === 'graphic'
				? buildTemplateGraphicPanel(studio)
				: kind === 'background' && background.state.type === 'image'
					? buildTemplateImagePanel(studio, true, 'floating')
					: null
	const profile = !selected
		? null
		: kind === 'background' && background.state.type === 'graphic'
			? '그래픽 프로파일 조정'
			: (kind === 'background' && background.state.type === 'image') ||
					(selected.kind === 'image' && selected.access === 'editable')
				? '이미지 프로파일 조정'
				: null
	return {
		panel: {
			identity: config.id,
			target: layers.selectedId ?? 'none',
			// 자리마다 대상 자기 것이 먼저, 배경 공통(Dimming·색)이 그다음이다.
			compositions: [base.composition, shared].filter(
				(item): item is ControlPanelComposition => item !== null,
			),
			// 플로팅 층을 여는 것은 이 버튼뿐이다 — 레이어를 고르거나 종류를 바꿔도 열리지 않는다.
			extras:
				profile && selected
					? {
							...base.extras,
							fixed: (
								<Button
									variant="muted"
									className="h-11 w-full rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/15"
									disabled={editing.busy}
									onClick={() => editing.begin(selected.id)}
								>
									{profile}
								</Button>
							),
						}
					: base.extras,
		},
		// 방식 행 — 배경은 배경 공통이(Image Mode), 이미지 슬롯은 플로팅 층 컴포지션이 갖는다.
		settings: kind === 'background' ? shared : (floating?.composition ?? null),
		floating: floating?.composition
			? {
					compositions: [floating.composition],
					extras: floating.extras,
					target: editing.targetId ?? undefined,
				}
			: null,
	}
}
