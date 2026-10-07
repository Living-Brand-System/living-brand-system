'use client'

import { Image as ImageIcon } from '@carbon/icons-react'
import { useState } from 'react'
import { ImageCanvas } from '@/components/studio/image/image-canvas'
import { PreviewRefreshButton } from '@/components/studio/shared/preview-refresh-button'
import { StudioSelectionChange } from '@/components/studio/shared/studio-selection-card'
import { StudioShell } from '@/components/studio/shared/studio-shell'
import { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Typography } from '@/components/ui/typography'
import { toOpenAIImageSize } from '@/features/image-generation/domain/image-size'
import type { ImageStudioConfig } from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import { ImageStudioProvider } from '@/features/image-generation/providers/image-studio-provider'
import { createImageArtifacts } from '@/features/image-generation/runtime/image-artifact.client'
import { useImageExport } from '@/features/studio-export/hooks/use-image-export'
import { useImagePanel } from './image-controls'
import { ImageProfilePicker } from './image-profile-picker'
import { ImageSettingPanel } from './image-setting-panel'

// 생성 표면: 편집 세션 소유는 ImageStudioProvider, 조작은 컨트롤러, 결과는 캔버스가 그린다.
export function ImageGenerator({ config }: { config: ImageStudioConfig | null }) {
	const [restart, setRestart] = useState<{ config: ImageStudioConfig; revision: number } | null>(
		null,
	)
	// 발행된 프로파일이 없으면 열 컨트롤이 없다 — 계약 없이 컨트롤러를 그리지 않는다.
	if (!config) {
		return (
			<Empty className="h-full border-0">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ImageIcon aria-hidden />
					</EmptyMedia>
					<EmptyTitle>발행된 이미지 프로파일이 없습니다</EmptyTitle>
					<EmptyDescription>
						관리자가 이미지 프로파일을 발행하면 생성을 시작할 수 있습니다.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<ImageStudioProvider key={restart?.revision ?? 0} config={restart?.config ?? config}>
			<ImageWorkspace
				onReset={(next) =>
					setRestart((current) => ({
						config: next,
						revision: (current?.revision ?? 0) + 1,
					}))
				}
			/>
		</ImageStudioProvider>
	)
}

function ImageWorkspace({ onReset }: { onReset: (config: ImageStudioConfig) => void }) {
	const { config, generation, history, profiles, results } = useImageStudio()
	const panel = useImagePanel()
	const items = results.items
	// 스트립을 누르면 위쪽이 이력으로 바뀌고, 생성을 시작하면 결과 그리드로 돌아온다.
	// effect 없이 렌더 중에 맞춘다 — effect면 한 프레임 이력이 보였다가 넘어간다.
	const [viewingHistory, setViewingHistory] = useState(false)
	if (generation.busy && viewingHistory) setViewingHistory(false)
	const showingHistory = !generation.busy && (viewingHistory || items.length === 0)

	// 🔑 저장 대상은 위쪽 캔버스가 보여주는 쪽을 따른다 — 이력을 보고 있으면 그 묶음, 아니면
	//    이번 세션 결과(2026-10-07 사용자 지시). 보이는 것과 저장되는 것이 갈리지 않게 한다.
	const picked = history.stack.find((item) => item.id === history.selectedId) ?? history.stack[0]
	const source = showingHistory
		? {
				images: history.stack.map((item) => item.url),
				// 이력은 색 조정 전 원본을 그린다 — 보이는 그대로 저장한다.
				color: null,
				selected: picked ? history.stack.indexOf(picked) : null,
				profileId: picked?.profileId,
				output:
					picked?.aspectRatio && picked.imageSize
						? { aspectRatio: picked.aspectRatio, imageSize: picked.imageSize }
						: null,
				metadata:
					picked?.profileName && picked.prompt
						? {
								profileName: picked.profileName,
								prompt: picked.prompt,
								createdAt: picked.createdAt,
							}
						: undefined,
			}
		: {
				images: items.map((item) => item.src),
				color: results.color,
				selected: results.selected,
				profileId: items[0]?.profileId,
				output: results.output,
				metadata: results.metadata,
			}
	const resultConfig = profiles.options.find((candidate) => candidate.id === source.profileId)
	const exportSize = source.output
		? toOpenAIImageSize(source.output.aspectRatio, source.output.imageSize)
				.split('x')
				.map(Number)
		: null
	const artifacts =
		source.images.length > 0
			? createImageArtifacts({ images: source.images, color: source.color })
			: null
	const download = useImageExport({
		metadata: source.metadata,
		artifacts,
		// ponytail: 이력의 프로파일이 아직 안 실렸으면 지금 프로파일의 출력 계약을 빌린다.
		capability: resultConfig?.output ?? config.output,
		selected: source.selected,
		size: exportSize ? { width: exportSize[0], height: exportSize[1] } : null,
	})

	// 🔑 화면의 결과를 만든 프로파일과 지금 편집 중인 프로파일이 같을 때만 갱신을 연다 —
	//    프로파일을 바꿔도 옛 결과가 남아 있어, 그대로 박으면 엉뚱한 카드에 남의 그림이 들어간다.
	const previewArtifact =
		resultConfig?.id === config.id && source.selected !== null
			? (artifacts?.raster[source.selected] ?? null)
			: null
	const preview = useProfilePreview({
		studio: 'image',
		profileId: config.id,
		artifact: previewArtifact,
		viewport: exportSize ? { width: exportSize[0], height: exportSize[1] } : null,
		onUpdated: profiles.browse.reload,
	})

	return (
		<StudioShell
			surface={{
				selection: {
					title: config.name,
					image: preview.image ?? config.previewImage,
					onReset: () => onReset(config),
					actions: (
						<>
							<PreviewRefreshButton preview={preview} />
							<StudioSelectionChange
								label="프로파일 변경"
								tabs={['Image Profiles']}
								empty={
									profiles.browse.status === 'ready' &&
									!profiles.browse.data?.some((item) => item.id !== config.id)
										? '교체할 다른 이미지 프로파일이 없습니다.'
										: undefined
								}
							>
								<ImageProfilePicker />
							</StudioSelectionChange>
						</>
					),
					children: preview.error && (
						<Typography role="alert" size="xs">
							{preview.error}
						</Typography>
					),
				},
				output: <ImageSettingPanel title="Output" download={download} />,
				canvas: (
					<ImageCanvas
						showingHistory={showingHistory}
						onSelectHistory={() => setViewingHistory(true)}
					/>
				),
				panel,
			}}
		/>
	)
}
