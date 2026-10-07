'use client'

import { ImageGenerationResults } from '@/components/studio/image/image-generation-results'
import { ImageHistoryStrip } from '@/components/studio/image/image-history-strip'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'

/**
 * 결과 캔버스 — 컨텍스트가 주는 것만 그리고 컨트롤러를 모른다.
 *
 * 🔑 위는 지금 보고 있는 한 장, 아래는 이 앱에서 만든 이미지 전체가 선 스트립이다
 *    (사용자 지시, 2026-09-21). 방금 만든 결과가 있으면 위쪽은 그 결과 그리드가 차지한다.
 * 🔑 위쪽은 사용자가 마지막에 한 행동을 따른다 — 스트립을 누르면 그 이력, 생성을 시작하면
 *    결과 그리드. 저장 버튼도 위쪽이 보여주는 쪽을 저장한다(2026-10-07 결정).
 * 🔴 「이미지를 생성하세요」 안내가 없다 — 스트립이 열리자마자 가장 최근 묶음을 골라 주므로
 *    빈 화면으로 남지 않는다.
 */
export function ImageCanvas({
	showingHistory,
	onSelectHistory,
}: {
	/** 위쪽에 이력을 그릴지 — 저장 대상도 같은 값을 따르므로 워크스페이스가 정한다. */
	showingHistory: boolean
	onSelectHistory: () => void
}) {
	const { generation, results } = useImageStudio()

	return (
		// 🔴 폭을 캔버스에 묶는다 — 없으면 스트립이 콘텐츠 폭만큼 늘어나 캔버스 전체가 함께 스크롤된다.
		<div className="flex h-full min-h-0 w-full min-w-0 flex-col">
			<div className="flex min-h-0 flex-1 flex-col">
				{!showingHistory ? (
					<ImageGenerationResults
						aspectRatio={
							generation.busy
								? generation.ratio
								: (results.output?.aspectRatio ?? generation.ratio)
						}
						color={results.color}
						items={results.items}
						loading={generation.busy}
						onSelect={results.select}
						referenceIndex={results.referenceIndex}
						requested={results.requested}
						selected={results.selected}
					/>
				) : (
					<SelectedImageView />
				)}
			</div>
			<ImageHistoryStrip onSelect={onSelectHistory} />
		</div>
	)
}

/** 고른 한 장을 크게. 아직 아무것도 안 골랐으면 아무것도 그리지 않는다. */
function SelectedImageView() {
	const { history } = useImageStudio()
	const selected =
		history.stack.find((item) => item.id === history.selectedId) ?? history.stack[0]
	if (!selected) return null

	return (
		<div className="flex min-h-0 flex-1 items-center justify-center p-4">
			{/* biome-ignore lint/performance/noImgElement: 스튜디오 미리보기, 최적화 불필요 */}
			<img
				src={selected.url}
				alt={selected.prompt ?? selected.profileName ?? '생성 이미지'}
				className="max-h-full max-w-full object-contain"
			/>
		</div>
	)
}
