'use client'

import { useCallback, useState } from 'react'
import { ControllerBrowser } from '@/components/shared/controller/browser'
import { GraphicCanvas } from '@/components/studio/graphic/graphic-canvas'
import { PreviewRefreshButton } from '@/components/studio/shared/preview-refresh-button'
import {
	StudioSelectionCard,
	StudioSelectionChange,
} from '@/components/studio/shared/studio-selection-card'
import { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import {
	SelectionPanel,
	WorkspaceCanvas,
	WorkspaceLayout,
} from '@/components/studio/shared/workspace-layout'
import { Typography } from '@/components/ui/typography'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'
import { GraphicStudioProvider } from '@/features/graphic-generation/providers/graphic-studio-provider'
import type { GraphicRuntime } from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import { useGraphicExport } from '@/features/studio-export/hooks/use-graphic-export'
import { GraphicEditingControls } from './graphic-editing-controls'
import { GraphicOutput } from './graphic-output'
import { GraphicProfilePicker } from './graphic-profile-picker'

type GraphicGeneratorProps = {
	config: GraphicStudioConfig
	/** 프로파일이 하나뿐인 스튜디오는 교체 카드를 세우지 않는다. */
	profileSwitching?: boolean
}

export function GraphicGenerator({ config, profileSwitching = true }: GraphicGeneratorProps) {
	const [restart, setRestart] = useState<{
		config: GraphicStudioConfig
		revision: number
	} | null>(null)
	return (
		<GraphicStudioProvider key={restart?.revision ?? 0} config={restart?.config ?? config}>
			<GraphicWorkspace
				profileSwitching={profileSwitching}
				onReset={(next) =>
					setRestart((current) => ({
						config: next,
						revision: (current?.revision ?? 0) + 1,
					}))
				}
			/>
		</GraphicStudioProvider>
	)
}
function GraphicWorkspace({
	profileSwitching,
	onReset,
}: {
	profileSwitching: boolean
	onReset: (config: GraphicStudioConfig) => void
}) {
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
		<WorkspaceLayout
			left={
				<ControllerBrowser.Root className="min-h-0">
					<SelectionPanel
						top={
							<StudioSelectionCard
								title={config.name}
								subtitle="Graphic"
								image={preview.image ?? config.previewImage}
								onReset={() => onReset(config)}
								actions={
									<>
										<PreviewRefreshButton preview={preview} />
										{profileSwitching && (
											<StudioSelectionChange
												label="그래픽 변경"
												tabs={['Graphic Profiles']}
											>
												<GraphicProfilePicker />
											</StudioSelectionChange>
										)}
									</>
								}
							>
								{preview.error && (
									<Typography role="alert" size="xs">
										{preview.error}
									</Typography>
								)}
							</StudioSelectionCard>
						}
						bottom={<GraphicOutput output={output} />}
					/>
				</ControllerBrowser.Root>
			}
			right={
				<GraphicEditingControls
					key={config.id}
					config={config}
					storedValues={controls.values}
					bindings={controls.bindings}
					onChange={controls.update}
				/>
			}
		>
			<WorkspaceCanvas>
				<GraphicCanvas output={output} registerArtifacts={registerArtifacts} />
			</WorkspaceCanvas>
		</WorkspaceLayout>
	)
}
