'use client'

import { useEffect } from 'react'
import { ControllerBrowser } from '@/components/shared/controller/browser'
import { OutputDimensions } from '@/components/studio/shared/output-dimensions'
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
import { TemplateCanvas } from '@/components/studio/template/template-canvas'
import { TemplateControls } from '@/components/studio/template/template-controls'
import { TemplateEditingPanel } from '@/components/studio/template/template-editing-panel'
import { TemplateOutputControls } from '@/components/studio/template/template-output-controls'
import { Typography } from '@/components/ui/typography'
import { useTemplateExport } from '@/features/studio-export/hooks/use-template-export'
import { formatMillimeters } from '@/features/studio-export/print-policy'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { TemplateLayerGroups } from './template-controls'
import { TemplateProfilePicker } from './template-profile-picker'
export function TemplateWorkspace({
	onChange,
	onReset,
}: {
	onChange?: (slug: string) => void
	onReset: () => void
}) {
	const { config, canvas, execution, layers, navigation } = useTemplateStudio()
	const firstLayer =
		config.template.slots.find((slot) => slot.kind === 'text')?.id ??
		config.template.slots[0]?.id
	useEffect(() => {
		if (firstLayer) layers.select(firstLayer)
	}, [firstLayer, layers.select])
	const exporting = useTemplateExport({
		artifact: canvas.artifact,
		vectorArtifact: canvas.vectorArtifact,
		videoArtifact: canvas.videoArtifact,
		capability: config.output,
		metadata: {
			fileName: config.name,
			width: config.template.exportOption.canvas.width,
			height: config.template.exportOption.canvas.height,
			maxScale: config.template.exportOption.maxScale,
			canvasPpi: config.template.exportOption.canvasPpi,
			controller: { groups: config.controller.groups, values: execution.controllerValues },
		},
	})
	const preview = useProfilePreview({
		studio: 'template',
		profileId: config.id,
		artifact: canvas.artifact,
		viewport: config.template.exportOption.canvas,
		onUpdated: navigation.browse.reload,
	})

	const size = exporting.sizeMm ?? exporting.outputSize ?? config.template.exportOption.canvas
	const dimension = (value: number) =>
		exporting.sizeMm ? formatMillimeters(value) : String(value)
	return (
		<div data-slot="template-panel-navigation" className="flex min-h-0 flex-col lg:flex-row">
			<div className="min-h-0 min-w-0 flex-1">
				<WorkspaceLayout
					left={
						<ControllerBrowser.Root className="min-h-0">
							<TemplateEditingPanel>
								<SelectionPanel
									top={
										<TemplateSelection
											preview={preview}
											onChange={onChange}
											onReset={onReset}
										/>
									}
									bottom={
										<>
											<div className="pb-3">
												<TemplateLayerGroups />
											</div>
											<hr className="my-1 border-border" />
											<TemplateOutputControls
												title="Output"
												exporting={exporting}
												sizeControl={
													<OutputDimensions
														width={dimension(size.width)}
														height={dimension(size.height)}
														unit={exporting.sizeMm ? 'mm' : 'px'}
													/>
												}
											/>
										</>
									}
								/>
							</TemplateEditingPanel>
						</ControllerBrowser.Root>
					}
					right={
						<div data-slot="studio-sidebar" className="h-full min-h-0">
							<TemplateControls />
						</div>
					}
				>
					<WorkspaceCanvas>
						<div className="h-full min-h-96 w-full lg:min-h-0">
							<TemplateCanvas />
						</div>
					</WorkspaceCanvas>
				</WorkspaceLayout>
			</div>
		</div>
	)
}

function TemplateSelection({
	onChange,
	onReset,
	preview,
}: {
	onChange?: (slug: string) => void
	onReset: () => void
	preview: ReturnType<typeof useProfilePreview>
}) {
	const { config, navigation } = useTemplateStudio()
	return (
		<StudioSelectionCard
			title={config.name}
			subtitle={navigation.categoryTitle ?? 'Template'}
			image={preview.image ?? config.previewImage}
			onReset={onReset}
			actions={
				<>
					<PreviewRefreshButton preview={preview} />
					<StudioSelectionChange label="템플릿 변경" tabs={['Templates']}>
						<TemplateProfilePicker onSelect={onChange} />
					</StudioSelectionChange>
				</>
			}
		>
			{preview.error && (
				<Typography role="alert" size="xs">
					{preview.error}
				</Typography>
			)}
		</StudioSelectionCard>
	)
}
