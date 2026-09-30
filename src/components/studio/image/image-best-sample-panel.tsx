'use client'

import { useEffect, useState } from 'react'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import type { GeneratedImageHistoryItem } from '@/features/image-generation/domain/generated-image-history'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import { fetchGeneratedImageHistory } from '@/features/image-generation/services/list-generated-image-history.client'
import { cn } from '@/lib/utils'

/**
 * 좌측 가운데 상자 — **본보기**다(사용자 지시, 2026-09-21). 이력이 아니라 manager가 admin에서
 * `bestSample`을 켜 둔 것만 선다. 고르면 그 값으로 편집 세션이 덮인다.
 *
 * 🔴 페이지가 없다. 사람이 골라 켜는 것이라 수가 적고, 여기서 훑을 일이 없기 때문이다 —
 *    이력 전체는 캔버스 아래 스트립이 갖는다.
 */
export function ImageBestSamplePanel() {
	const { history } = useImageStudio()
	const [items, setItems] = useState<GeneratedImageHistoryItem[] | null>(null)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let alive = true
		fetchGeneratedImageHistory(1, { bestOnly: true }).then(
			(result) => alive && setItems(result.items),
			() => alive && setFailed(true),
		)
		return () => {
			alive = false
		}
	}, [])

	if (failed || (items && items.length === 0)) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>
						{failed ? '본보기를 불러오지 못했습니다' : '아직 지정된 본보기가 없습니다'}
					</EmptyTitle>
					{!failed && (
						<EmptyDescription>
							관리자가 생성 기록에서 본보기로 지정하면 여기에 표시됩니다.
						</EmptyDescription>
					)}
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<div data-slot="image-best-samples" className="grid grid-cols-2 gap-2 px-3 py-3">
			{(items ?? []).map((item) => {
				const label = item.prompt ?? item.profileName ?? '본보기 이미지'
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => history.selectStack([item])}
						title={item.prompt ?? undefined}
						aria-current={item.id === history.selectedId || undefined}
						aria-label={label}
						className={cn(
							'overflow-hidden rounded-md border bg-muted outline-none',
							'focus-visible:ring-2 focus-visible:ring-ring',
							item.id === history.selectedId
								? 'border-2 border-ring'
								: 'border-border hover:border-ring',
						)}
					>
						{/* biome-ignore lint/performance/noImgElement: 썸네일, 최적화 불필요 */}
						<img
							src={item.url}
							alt={label}
							loading="lazy"
							className="aspect-square w-full object-cover"
						/>
					</button>
				)
			})}
		</div>
	)
}
