'use client'

import { Image as ImageIcon } from '@carbon/icons-react'
import { ImageCanvas } from '@/components/studio/image/image-canvas'
import { StudioWorkspace } from '@/components/studio/shared/studio-workspace'
import { useProfilePreview } from '@/components/studio/shared/use-profile-preview'
import { ImageLeftPanel } from '@/components/studio/sidebar/image-left-panel'
import { ImageSidebar } from '@/components/studio/sidebar/image-sidebar'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { toOpenAIImageSize } from '@/features/image-generation/domain/image-size'
import type { ImageStudioConfig } from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import { ImageStudioProvider } from '@/features/image-generation/providers/image-studio-provider'
import { createImageArtifacts } from '@/features/image-generation/runtime/image-artifact.client'
import { useImageExport } from '@/features/studio-export/hooks/use-image-export'

// 생성 표면: 편집 세션 소유는 ImageStudioProvider, 조작은 컨트롤러, 결과는 캔버스가 그린다.
export function ImageGenerator({ config }: { config: ImageStudioConfig | null }) {
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
		<ImageStudioProvider config={config}>
			<ImageWorkspace />
		</ImageStudioProvider>
	)
}

function ImageWorkspace() {
	const { config, profiles, results } = useImageStudio()
	const items = results.items
	const resultConfig = profiles.options.find((candidate) => candidate.id === items[0]?.profileId)
	const exportSize = results.output
		? toOpenAIImageSize(results.output.aspectRatio, results.output.imageSize)
				.split('x')
				.map(Number)
		: null
	const artifacts =
		items.length > 0
			? createImageArtifacts({
					images: items.map((item) => item.src),
					color: results.color,
				})
			: null
	const download = useImageExport({
		metadata: results.metadata,
		artifacts,
		capability: resultConfig?.output ?? { formats: [], original: false },
		selected: results.selected,
		size: exportSize ? { width: exportSize[0], height: exportSize[1] } : null,
	})

	// 🔑 화면의 결과를 만든 프로파일과 지금 편집 중인 프로파일이 같을 때만 갱신을 연다 —
	//    프로파일을 바꿔도 옛 결과가 남아 있어, 그대로 박으면 엉뚱한 카드에 남의 그림이 들어간다.
	const previewArtifact =
		resultConfig?.id === config.id && results.selected !== null
			? (artifacts?.raster[results.selected] ?? null)
			: null
	const preview = useProfilePreview({
		studio: 'image',
		profileId: config.id,
		artifact: previewArtifact,
		viewport: exportSize ? { width: exportSize[0], height: exportSize[1] } : null,
		onUpdated: profiles.browse.reload,
	})

	return (
		<StudioWorkspace
			leftPanel={<ImageLeftPanel download={download} preview={preview} />}
			sidebar={<ImageSidebar />}
		>
			<ImageCanvas />
		</StudioWorkspace>
	)
}
