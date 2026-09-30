'use client'

import { useCallback, useState } from 'react'
import { GraphicCanvas } from '@/components/studio/graphic/graphic-canvas'
import { StudioWorkspace } from '@/components/studio/shared/studio-workspace'
import { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import { GraphicLeftPanel } from '@/components/studio/sidebar/graphic-left-panel'
import { GraphicSidebar } from '@/components/studio/sidebar/graphic-sidebar'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'
import { GraphicStudioProvider } from '@/features/graphic-generation/providers/graphic-studio-provider'
import type { GraphicRuntime } from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import { useGraphicExport } from '@/features/studio-export/hooks/use-graphic-export'

type GraphicGeneratorProps = {
	config: GraphicStudioConfig
	/** 프로파일이 하나뿐인 스튜디오는 교체 카드를 세우지 않는다. */
	profileSwitching?: boolean
}

/** 가변 그래픽 Definition을 하나의 편집 세션·Controller·Canvas에 배선한다. */
export function GraphicGenerator({ config, profileSwitching = true }: GraphicGeneratorProps) {
	return (
		<GraphicStudioProvider config={config}>
			<GraphicWorkspace profileSwitching={profileSwitching} />
		</GraphicStudioProvider>
	)
}

function GraphicWorkspace({ profileSwitching }: { profileSwitching: boolean }) {
	const { config, controls, profiles } = useGraphicStudio()
	const [browserState, setBrowserState] = useState<{
		profileId: string
		artifacts: GraphicRuntime['artifacts']
		viewport: { width: number; height: number }
	} | null>(null)
	const browser = browserState?.profileId === config.id ? browserState : null
	const registerArtifacts = useCallback(
		(
			artifacts: GraphicRuntime['artifacts'] | null,
			viewport?: { width: number; height: number },
		) => {
			setBrowserState(
				artifacts && viewport ? { profileId: config.id, artifacts, viewport } : null,
			)
		},
		[config.id],
	)
	const { output } = useGraphicExport({
		artifacts: browser?.artifacts ?? null,
		config,
		values: controls.values,
		viewport: browser?.viewport ?? null,
	})
	// 캔버스가 mount된 뒤에야 Artifact가 생기므로 상태는 Artifact를 쥔 이 자리가 소유한다.
	const preview = useProfilePreview({
		studio: config.studio,
		profileId: config.id,
		artifact: browser?.artifacts.raster ?? null,
		viewport: browser?.viewport ?? null,
		onUpdated: profiles.browse.reload,
	})

	return (
		<StudioWorkspace
			leftPanel={<GraphicLeftPanel />}
			sidebar={
				<GraphicSidebar
					output={output}
					preview={preview}
					profileSwitching={profileSwitching}
				/>
			}
		>
			<GraphicCanvas output={output} registerArtifacts={registerArtifacts} />
		</StudioWorkspace>
	)
}
