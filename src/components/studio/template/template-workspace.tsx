'use client'

import { useEffect } from 'react'
import { ControllerBrowser } from '@/components/shared/controller/browser'
import { OutputDimensions } from '@/components/studio/shared/output-dimensions'
import { PanelRenderScope } from '@/components/studio/shared/panel-render'
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
	const { config, canvas, execution, layers, navigation, background } = useTemplateStudio()
	// 오른쪽 패널의 영역별 내용 — 고정 영역(Dimming·텍스트 색 등)은 레이어 종류로, 내용 영역은 배경 방식까지 갈린다.
	// 🔴 배경 방식만 바뀌면 고정 영역은 그대로다(Dimming은 방식과 무관) — 그 카드는 다시 그리지 않는다.
	const kind = layers.selectedKind ?? 'none'
	const panelKeys = {
		fixed: kind,
		content: kind === 'background' ? `${kind}:${background.state.type}` : kind,
	}
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
							{/* 레이어(와 배경 방식)가 바뀌면 오른쪽 패널의 내용 열을 공용 패널 렌더로 다시 그린다. */}
							<PanelRenderScope keys={panelKeys}>
								<TemplateControls />
							</PanelRenderScope>
						</div>
					}
				>
					<WorkspaceCanvas>
						{/* Figma 529:19461 — 작품 축은 화면(상단 메뉴) 중심이다. 오른쪽 패널이 왼쪽보다
						    56px 넓어 캔버스 열 중심과 28px 어긋나므로 왼쪽에 그만큼 더 비운다. */}
						<div className="h-full min-h-96 w-full lg:min-h-0 lg:pl-14">
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
