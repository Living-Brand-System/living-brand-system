'use client'

import { Controller } from '@/components/shared/controller'
import { ControllerRenderer } from '@/components/shared/controller-renderer'
import { GRAPHIC_ASSET_SOURCES } from '@/components/studio/graphic/graphic-asset-sources'
import { GraphicProfilePicker } from '@/components/studio/graphic/graphic-profile-picker'
import { browseEmptyMessage } from '@/components/studio/shared/browse-status'
import {
	ExportAction,
	SizingControls,
	VideoControls,
} from '@/components/studio/shared/output-controls'
import { PreviewRefreshSlot } from '@/components/studio/shared/preview-refresh-slot'
import type { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import { StudioSidebar } from '@/components/studio/sidebar/studio-sidebar'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'
import { STUDIO_OUTPUT_FORMAT_OPTIONS } from '@/features/studio-export/export-contract'
import type { GraphicExportView } from '@/features/studio-export/hooks/use-graphic-export'
import { splitControllerGroups } from '@/modules/studio-controller/controller-definition'

/** Definition을 Controller primitive로 투영한다. 캔버스와 런타임 구현은 모른다. */
export function GraphicSidebar({
	output,
	preview,
	profileSwitching = true,
}: {
	output: GraphicExportView
	preview: ReturnType<typeof useProfilePreview>
	/**
	 * 프로파일 카드를 세울지. 🔴 프로파일이 하나뿐인 스튜디오(Graph)에서는 이 카드가 보여줄 것이
	 * 자기 이름밖에 없고 「Change」가 빈 목록을 연다 — 고를 것이 없으면 고르는 자리도 없다.
	 */
	profileSwitching?: boolean
}) {
	const { config, groups, profiles, controls } = useGraphicStudio()
	/**
	 * 🔑 이 패널은 **왼쪽에 서지 않은 축 전부**를 그린다 — 세기·속도처럼 세밀하고 잡다한 값들이다.
	 *    감추지 않는다: 창작자가 다룰 수는 있어야 하고, 다만 다루리라 기대하지 않는 자리다.
	 *    큰 축(색 조합·형태)은 `GraphicLeftPanel`이 캔버스 왼쪽에서 갖는다.
	 */
	const { right: rightGroups } = splitControllerGroups(
		groups,
		config.controller.left,
		config.controller.right,
	)
	const format = output.draft?.format
	const video = format === 'mp4' ? config.output.video?.mp4 : undefined
	const formatOptions = STUDIO_OUTPUT_FORMAT_OPTIONS.filter(({ value }) =>
		config.output.formats.includes(value),
	)
	const formatLabel = formatOptions.find(({ value }) => value === format)?.label
	const footer = output.draft ? (
		<>
			<div className="flex flex-col gap-1">
				<div className="flex h-9 items-center pt-1">
					<span className="text-sm font-semibold text-muted-foreground">Setting</span>
				</div>
				<SizingControls
					value={{ width: output.draft.width, height: output.draft.height }}
					maxWidth={video?.maxWidth}
					maxHeight={video?.maxHeight}
					ppi={output.ppi}
					ppiOptions={output.ppiOptions}
					onChange={output.setSize}
					onPpiChange={output.setPpi}
				/>
				<Controller.Row label="Format" readonly={config.output.formats.length <= 1}>
					{config.output.formats.length <= 1 ? (
						<span className="text-sm text-muted-foreground">{formatLabel}</span>
					) : (
						<Controller.Select
							options={formatOptions}
							value={format}
							onChange={(next) =>
								output.setFormat(next as (typeof config.output.formats)[number])
							}
						/>
					)}
				</Controller.Row>
				{format === 'mp4' && video && (
					<VideoControls
						fps={output.draft.fps}
						fpsOptions={video.fps}
						durationSeconds={output.draft.durationSeconds}
						maxDurationSeconds={video.maxDurationSeconds}
						onFpsChange={output.setFps}
						onDurationChange={output.setDuration}
					/>
				)}
			</div>
			<ExportAction
				busy={output.busy}
				disabled={!output.canExport}
				error={output.error}
				onExport={output.run}
			/>
		</>
	) : undefined

	return (
		<Controller.Browser.Root>
			<StudioSidebar
				header={
					profileSwitching ? (
						<PreviewRefreshSlot error={preview.error}>
							<Controller.AssetCard
								title={config.name}
								subtitle={`${config.type.toUpperCase()} Graphic`}
								buttonLabel="Change"
								aria-label="그래픽 변경"
								tabs={['Graphic Profiles']}
								previewImage={preview.image ?? config.previewImage}
								onRefreshPreview={preview.canRefresh ? preview.refresh : undefined}
								refreshingPreview={preview.refreshing}
								empty={browseEmptyMessage(
									profiles.browse.status,
									(profiles.browse.data?.length ?? 0) > 1,
									'교체할 다른 그래픽 프로파일이 없습니다.',
								)}
								className="min-h-32 items-start"
							>
								<GraphicProfilePicker />
							</Controller.AssetCard>
						</PreviewRefreshSlot>
					) : undefined
				}
				footer={footer}
			>
				<ControllerRenderer
					groups={rightGroups}
					presentation={config.controllerPresentation}
					values={controls.values}
					bindings={controls.bindings}
					assetSources={GRAPHIC_ASSET_SOURCES}
					onChange={controls.update}
				/>
			</StudioSidebar>
		</Controller.Browser.Root>
	)
}
