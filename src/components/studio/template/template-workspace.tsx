'use client'

import { useEffect } from 'react'
import { OutputDimensions } from '@/components/studio/shared/output-dimensions'
import { PreviewRefreshButton } from '@/components/studio/shared/preview-refresh-button'
import { StudioSelectionChange } from '@/components/studio/shared/studio-selection-card'
import { StudioShell } from '@/components/studio/shared/studio-shell'
import { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import { TemplateCanvas } from '@/components/studio/template/template-canvas'
import { TemplateEditingPanel } from '@/components/studio/template/template-editing-panel'
import { TemplateOutputControls } from '@/components/studio/template/template-output-controls'
import { useTemplatePanel } from '@/components/studio/template/template-panel'
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
	const templatePanel = useTemplatePanel()
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
			printSizeMm: config.template.exportOption.printSizeMm,
			digitalSizePx: config.template.exportOption.digitalSizePx,
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
				<StudioShell
					surface={{
						selection: {
							title: config.name,
							subtitle: navigation.categoryTitle ?? 'Template',
							image: preview.image ?? config.previewImage,
							onReset,
							actions: (
								<>
									<PreviewRefreshButton preview={preview} />
									<StudioSelectionChange label="템플릿 변경" tabs={['Templates']}>
										<TemplateProfilePicker onSelect={onChange} />
									</StudioSelectionChange>
								</>
							),
							children: preview.error && (
								<Typography role="alert" size="xs">
									{preview.error}
								</Typography>
							),
						},
						output: (
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
						),
						// 편집 오버레이가 기본 카드 묶음(마스터)을 감싸고 그 위로 대상 카드·설정 카드를 띄운다.
						frame: (master) => (
							<TemplateEditingPanel settings={templatePanel.settings}>
								{master}
							</TemplateEditingPanel>
						),
						canvas: (
							// Figma 529:19461 — 작품 축은 화면(상단 메뉴) 중심이다. 오른쪽 패널이 왼쪽보다
							// 56px 넓어 캔버스 열 중심과 28px 어긋나므로 왼쪽에 그만큼 더 비운다.
							<div className="h-full min-h-96 w-full lg:min-h-0 lg:pl-14">
								<TemplateCanvas />
							</div>
						),
						panel: templatePanel.panel,
					}}
				/>
			</div>
		</div>
	)
}
