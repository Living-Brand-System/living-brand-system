'use client'

import { useMemo } from 'react'
import { IMAGE_WIDGETS } from '@/components/studio/image/widgets/registry'
import type { StudioSurface } from '@/components/studio/shared/studio-shell'
import { Typography } from '@/components/ui/typography'
import {
	deriveImageStudioComposition,
	IMAGE_COMPOSITION_GATE_IDS,
} from '@/features/image-generation/domain/image-studio-composition'
import { getImageStudioControls } from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'

/**
 * 이미지 패널의 배치 정책 — 역할을 자리에 놓는다(docs/10 §3.7). Figma 529:19999·529:25129 — Basic은 생성 입력,
 * Adjustment는 색과 시점이다. 생성 버튼과 장수·비율·해상도는 Output 카드에 있다(계약 밖).
 */
export const IMAGE_PANEL_POLICY: StudioPanelPolicy = {
	basic: ['content', 'source'],
	adjustment: ['palette', 'view'],
}

// 생성 그룹은 접지 않는다 — 프롬프트가 이 화면의 주 입력이다.
const IMAGE_PANEL_PRESENTATION = {
	groups: [{ groupId: 'generate', collapsible: false, defaultOpen: true }],
}

/** 이미지 스튜디오의 오른쪽 패널 — 셸(`StudioShell`)이 그린다. 프로파일을 바꾸면 패널을 새로 시작한다. */
export function useImagePanel(): StudioSurface['panel'] {
	const { config, controls, generation, camera, reference } = useImageStudio()
	const manifest = useMemo(() => deriveImageStudioComposition(config), [config])
	const values: ControllerValues = {
		...controls.values,
		[IMAGE_COMPOSITION_GATE_IDS.reference]: reference.enabled,
		[IMAGE_COMPOSITION_GATE_IDS.camera]: camera.enabled,
	}
	const { prompt } = getImageStudioControls(config)
	return {
		identity: config.id,
		compositions: [
			{
				slots: arrangeStudioPanel(manifest, IMAGE_PANEL_POLICY, values),
				values,
				// 카메라 시점 변경은 시드 이미지를 돌려 그린다 — 그동안 프롬프트는 쓰이지 않는다.
				bindings: camera.enabled
					? { ...controls.bindings, [prompt.id]: { availability: 'disabled' } }
					: controls.bindings,
				presentation: IMAGE_PANEL_PRESENTATION,
				widgets: IMAGE_WIDGETS,
				onChange: (id, next) => {
					if (id === IMAGE_COMPOSITION_GATE_IDS.reference)
						reference.setEnabled(next === true)
					else if (id === IMAGE_COMPOSITION_GATE_IDS.camera)
						camera.setEnabled(next === true)
					else controls.update(id, next)
				},
			},
		],
		extras: generation.error
			? {
					basic: (
						<Typography role="alert" size="sm" className="text-destructive">
							{generation.error}
						</Typography>
					),
				}
			: undefined,
	}
}
