'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { GeneratedImageHistoryItem } from '@/features/image-generation/domain/generated-image-history'
import { groupHistoryByDate } from '@/features/image-generation/domain/generated-image-history'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import { fetchGeneratedImageHistory } from '@/features/image-generation/services/list-generated-image-history.client'
import { cn } from '@/lib/utils'

/**
 * 캔버스 아래 스트립 — 이 앱에서 만든 이미지 **전체**가 한 줄에 선다(사용자 지시, 2026-09-21).
 *
 * 🔑 묶음은 겹쳐 보여주지 않고 **얇은 구분선**으로만 가른다 — 한 번에 생성한 것끼리 붙어 있고,
 *    묶음 경계가 선 하나로 읽힌다.
 * 🔴 무한 스크롤을 두지 않는다(사용자 지시). 한 번에 최근 한 묶음분만 내리고, 더 당기지 않는다.
 * ponytail: 그래서 아주 오래된 이력은 여기에 안 나온다. 더 필요해지면 페이지가 아니라
 *    「기간으로 좁히기」가 맞는 처방이다(스크롤을 늘리는 쪽은 이미 한 번 접었다).
 */
export function ImageHistoryStrip({ onSelect }: { onSelect: () => void }) {
	const { generation, history } = useImageStudio()
	const [items, setItems] = useState<GeneratedImageHistoryItem[]>([])

	// 생성이 끝날 때마다 다시 받는다 — 방금 만든 묶음이 맨 앞에 붙는다.
	const busy = generation.busy
	useEffect(() => {
		if (busy) return
		let alive = true
		fetchGeneratedImageHistory(1).then(
			(result) => alive && setItems(result.items),
			() => undefined,
		)
		return () => {
			alive = false
		}
	}, [busy])

	// 날짜 안에서 묶음까지 갈라 둔 구조를 그대로 쓴다 — 여기서는 날짜 머리글 없이 묶음만 쓴다.
	const stacks = useMemo(
		() => groupHistoryByDate(items).flatMap((group) => group.stacks),
		[items],
	)

	// 아직 아무것도 안 골랐으면 가장 최근 묶음이 자동으로 선택된다(사용자 지시, 2026-09-21).
	// 🔴 캔버스에만 올리고 세션은 덮지 않는다(2026-10-01 결정) — 목록이 늦게 오면 그 사이 넣은
	//    프롬프트·참조 이미지가 조용히 사라졌다. 복원은 사용자가 스트립을 눌렀을 때만 한다.
	const { selectStack } = history
	const firstStack = stacks[0]
	const [autoSelected, setAutoSelected] = useState(false)
	useEffect(() => {
		if (autoSelected || !firstStack) return
		setAutoSelected(true)
		selectStack(firstStack.items, undefined, { restore: false })
	}, [autoSelected, firstStack, selectStack])

	if (stacks.length === 0) return null

	return (
		<div
			data-slot="image-history-strip"
			data-testid="strip"
			className="scrollbar-none flex min-w-0 shrink-0 items-center gap-2 overflow-x-auto px-2 py-2"
			// 스크롤바를 숨겼으므로 마우스 휠(세로)도 가로로 넘긴다. 트랙패드 가로 입력은 그대로 둔다.
			onWheel={(event) => {
				if (Math.abs(event.deltaY) > Math.abs(event.deltaX))
					event.currentTarget.scrollLeft += event.deltaY
			}}
		>
			{stacks.map((stack, index) => (
				<Fragment key={stack.key}>
					{/* 묶음 사이의 얇은 구분선. 첫 묶음 앞에는 그리지 않는다. */}
					{index > 0 && <div aria-hidden className="h-10 w-px shrink-0 bg-border" />}
					{stack.items.map((item) => {
						const selected = item.id === history.selectedId
						const label = item.prompt ?? item.profileName ?? '생성 이미지'
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => {
									history.selectStack(stack.items, item.id)
									onSelect()
								}}
								title={item.prompt ?? undefined}
								aria-current={selected || undefined}
								aria-label={label}
								className={cn(
									'size-16 shrink-0 overflow-hidden rounded-md border bg-muted outline-none',
									'focus-visible:ring-2 focus-visible:ring-ring',
									selected
										? 'border-2 border-ring'
										: 'border-border hover:border-ring',
								)}
							>
								{/* biome-ignore lint/performance/noImgElement: 썸네일, 최적화 불필요 */}
								<img
									src={item.url}
									alt=""
									loading="lazy"
									className="size-full object-cover"
								/>
							</button>
						)
					})}
				</Fragment>
			))}
		</div>
	)
}
