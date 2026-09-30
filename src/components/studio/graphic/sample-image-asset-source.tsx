'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, ControllerBrowser } from '@/components/shared/controller'
import { browseEmptyMessage } from '@/components/studio/shared/browse-status'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import {
	fetchSampleImages,
	type SampleImageOption,
} from '@/features/template-customization/services/list-sample-images.client'
import { useLazyResource } from '@/hooks/use-lazy-resource'
import { cn } from '@/lib/utils'

/** 빈 목록의 신원을 고정한다 — 렌더마다 새 배열을 만들면 useMemo가 매번 다시 돈다. */
const NO_OPTIONS: readonly SampleImageOption[] = []

/**
 * `asset` control의 `sample-images` 출처 구현 — 킷(AssetCard·Browser)이 크롬을, 이 파일이 도메인을 갖는다.
 *
 * 🔑 값은 **URL 문자열**이다. `ControllerControlValue`가 객체를 담지 못하기도 하고, 런타임이
 *    필요로 하는 것도 id가 아니라 그릴 수 있는 주소 하나뿐이다.
 * 🔴 목록을 Definition에 넣지 않는다 — 넣으면 정의가 업로드된 자산에 묶여 환경마다 달라진다.
 */
export function SampleImageAssetSource({
	label,
	value,
	disabled,
	onChange,
}: {
	label: string
	value: string | null
	disabled?: boolean
	onChange: (value: string | null) => void
}) {
	const images = useLazyResource(fetchSampleImages)
	const options = images.data ?? NO_OPTIONS
	const selected = options.find((option) => option.url === value)

	return (
		<Controller.AssetCard
			title={selected?.name ?? (value ? '고른 이미지' : '이미지를 선택하세요')}
			subtitle={label}
			buttonLabel={value ? 'Change' : 'Browse'}
			aria-label={`${label} 선택`}
			tabs={['Sample Images']}
			panelSide="right"
			previewImage={
				selected
					? { url: selected.thumbnailUrl, alt: selected.alt }
					: value
						? { url: value, alt: label }
						: undefined
			}
			disabled={disabled}
		>
			<SampleImageGrid
				load={images.load}
				status={images.status}
				options={options}
				selectedUrl={value}
				onSelect={(option) => onChange(option.url)}
				onClear={() => onChange(null)}
			/>
		</Controller.AssetCard>
	)
}

function SampleImageGrid({
	load,
	status,
	options,
	selectedUrl,
	onSelect,
	onClear,
}: {
	load: () => void
	status: ReturnType<typeof useLazyResource<readonly SampleImageOption[]>>['status']
	options: readonly SampleImageOption[]
	selectedUrl: string | null
	onSelect: (option: SampleImageOption) => void
	onClear: () => void
}) {
	// 패널이 열릴 때 마운트된다(radix가 닫힌 콘텐츠를 언마운트한다) — mount가 곧 "열림"이다.
	useEffect(() => {
		load()
	}, [load])

	const [selectedGroups, setSelectedGroups] = useState<string[]>([])
	// 분류 목록은 값에서 역산한다 — 분류 테이블이 없어도 태그 필터가 성립한다.
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

	const empty = browseEmptyMessage(
		status,
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

	return (
		<div data-slot="sample-image-asset-source" className="flex shrink-0 flex-col gap-3 pr-1">
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
			<div className="grid grid-cols-3 gap-3">
				{/* 비우기도 고르기다 — 이미지를 걷어내는 길이 브라우저 안에 없으면 되돌릴 수 없다. */}
				<ControllerBrowser.Close asChild>
					<button
						type="button"
						aria-current={selectedUrl === null || undefined}
						onClick={onClear}
						className={cn(
							'flex h-48 items-center justify-center rounded-lg border text-sm outline-none focus-visible:ring-2 focus-visible:ring-background/50',
							selectedUrl === null
								? 'border-2 border-background/60'
								: 'border-background/10 hover:bg-background/10',
						)}
					>
						이미지 없음
					</button>
				</ControllerBrowser.Close>
				{visible.map((option) => {
					const current = option.url === selectedUrl

					return (
						<ControllerBrowser.Close key={option.id} asChild>
							<button
								type="button"
								aria-current={current || undefined}
								onClick={() => onSelect(option)}
								className={cn(
									'flex h-48 flex-col overflow-hidden rounded-lg border bg-background/5 text-left outline-none focus-visible:ring-2 focus-visible:ring-background/50',
									current
										? 'border-2 border-background/60'
										: 'border-background/10 hover:bg-background/10',
								)}
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
								</div>
							</button>
						</ControllerBrowser.Close>
					)
				})}
			</div>
		</div>
	)
}
