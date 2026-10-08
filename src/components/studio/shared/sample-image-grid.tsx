'use client'

import { cva } from 'class-variance-authority'
import { type ReactElement, useEffect, useMemo, useState } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import { browseEmptyMessage } from '@/components/studio/shared/browse-status'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import type { SampleImageOption } from '@/features/template-customization/services/list-sample-images.client'
import type { LazyResource } from '@/hooks/use-lazy-resource'
import { cn } from '@/lib/utils'

/** 빈 목록의 신원을 고정한다 — 렌더마다 새 배열을 만들면 useMemo가 매번 다시 돈다. */
const NO_OPTIONS: readonly SampleImageOption[] = []

const sampleCardVariants = cva(
	'flex h-48 flex-col overflow-hidden rounded-lg border text-left outline-none focus-visible:ring-2',
	{
		variants: {
			/** `browser`는 어두운 자산 브라우저 패널 위, `inline`은 컨트롤러 패널 안(muted 면 위)이다. */
			layout: {
				browser: 'bg-background/5 focus-visible:ring-background/50',
				inline: 'bg-muted focus-visible:ring-ring',
			},
			// 브라우저는 현재 선택을 보여야 한다 — 테두리 두께와 aria-current로 함께 알린다.
			current: {
				true: 'border-2 border-background/60',
				false: 'border-background/10 hover:bg-background/10',
			},
		},
	},
)

/** 판형 표기. 크기를 모르는 문서는 아무것도 적지 않는다 — 「0 × 0」은 거짓이다. */
function formatSampleImageSize({ width, height }: SampleImageOption) {
	return width && height ? `${width} × ${height}` : null
}

/**
 * 샘플 이미지 카드 그리드 — 템플릿 이미지 슬롯(패널 안)과 그래픽 `asset` control(자산 브라우저)이 함께 쓴다.
 * 목록은 패널이 열릴 때 마운트되며 가져온다(radix가 닫힌 콘텐츠를 언마운트한다 — mount가 곧 "열림",
 * 실패했다면 다시 열 때 재시도된다). 고른 뒤 무엇을 하는지는 `onSelect`가, 닫기는 `browser` 배치의
 * `Controller.Browser.Close`가 갖는다.
 */
export function SampleImageGrid({
	images,
	layout,
	isCurrent,
	onSelect,
	onClear,
}: {
	images: LazyResource<readonly SampleImageOption[]>
	layout: 'browser' | 'inline'
	isCurrent: (option: SampleImageOption) => boolean
	onSelect: (option: SampleImageOption) => void
	/** 「이미지 없음」 카드 — 비우기도 고르기다. 주면 그 카드가 맨 앞에 서고, 아무것도 고르지 않은 상태가 현재다. */
	onClear?: { current: boolean; select: () => void }
}) {
	const { load } = images
	useEffect(() => {
		load()
	}, [load])
	// ToggleGroup이 선택 목록을 배열로 주고받는다 — Set으로 들고 있으면 변환만 오간다.
	const [selectedGroups, setSelectedGroups] = useState<string[]>([])
	// `?? []`를 렌더 본문에 두면 매 렌더마다 새 배열이라 아래 useMemo가 memo 구실을 못 한다.
	const options = images.data ?? NO_OPTIONS
	// 분류 목록은 값에서 역산한다 — 분류 테이블이 없어도 태그 필터가 성립한다(BrandIcons와 같다).
	const groups = useMemo(
		() =>
			[...new Set(options.flatMap((option) => (option.group ? [option.group] : [])))].sort(),
		[options],
	)
	const picked = useMemo(() => new Set(selectedGroups), [selectedGroups])
	const visible = useMemo(
		() => (picked.size === 0 ? options : options.filter((option) => picked.has(option.group))),
		[options, picked],
	)

	// 패널 안에서는 고를 것이 없으면 자리 자체를 비운다 — 안내 문구가 패널을 차지할 이유가 없다.
	if (layout === 'inline' && images.status === 'ready' && !options.length) return null
	const empty = browseEmptyMessage(
		images.status,
		options.length > 0,
		'고를 수 있는 샘플 이미지가 없습니다.',
	)
	if (empty) {
		return (
			<Typography as="p" size="sm" className="px-1 py-2">
				{empty}
			</Typography>
		)
	}

	// 브라우저 안의 카드는 고르면 패널을 닫는다 — 열림 상태는 킷이 소유한다.
	const close = (key: string | number, card: ReactElement) =>
		layout === 'browser' ? (
			<ControllerBrowser.Close key={key} asChild>
				{card}
			</ControllerBrowser.Close>
		) : (
			card
		)

	return (
		<div data-slot="sample-image-grid" className="flex shrink-0 flex-col gap-3 pr-1">
			{groups.length > 0 && (
				<ToggleGroup
					type="multiple"
					variant="outline"
					value={selectedGroups}
					onValueChange={setSelectedGroups}
					aria-label="샘플 이미지 분류 필터"
					className="flex-wrap justify-start"
				>
					{groups.map((group) => (
						<ToggleGroupItem key={group} value={group} className="px-3">
							{group}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			)}
			{visible.length === 0 && !onClear ? (
				<Typography as="p" size="sm" className="px-1 py-2">
					고른 분류에 맞는 샘플 이미지가 없습니다.
				</Typography>
			) : (
				<div
					className={cn(
						'grid gap-3',
						layout === 'inline' ? 'grid-cols-2' : 'grid-cols-3',
					)}
				>
					{onClear &&
						close(
							'clear',
							<button
								key="clear"
								type="button"
								aria-current={onClear.current || undefined}
								onClick={onClear.select}
								className={cn(
									sampleCardVariants({ layout, current: onClear.current }),
									'items-center justify-center text-sm',
								)}
							>
								이미지 없음
							</button>,
						)}
					{visible.map((option) => {
						const current = isCurrent(option)
						const size = formatSampleImageSize(option)
						return close(
							option.id,
							<button
								key={option.id}
								type="button"
								aria-current={current || undefined}
								onClick={() => onSelect(option)}
								className={sampleCardVariants({ layout, current })}
							>
								<ControllerBrowser.Thumbnail
									image={{ url: option.thumbnailUrl, alt: option.alt }}
								/>
								<div className="flex shrink-0 flex-col bg-background/5 px-1.5 py-2">
									<Typography
										as="p"
										size="xs"
										weight="medium"
										className="truncate"
									>
										{option.name}
									</Typography>
									{size && <Typography size="xs">{size}</Typography>}
								</div>
							</button>,
						)
					})}
				</div>
			)}
		</div>
	)
}
