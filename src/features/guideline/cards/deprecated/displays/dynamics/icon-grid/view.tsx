'use client'

import { Contrast, Shuffle } from '@carbon/icons-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

// 서버(블록)가 DB에서 조립해 내려주는 아이콘 1개. 색은 컬러 모드일 때만 채워진다(팔레트 hex).
export type IconGridItem = {
	id: string | number
	n: number
	name: string
	group: string
	src: string
	ratio: string
	fgHex?: string | null
	bgHex?: string | null
}

// 액션 버튼(순서복원·섞기·전체) 공통 — 채운 secondary. border 없음, radius만.
const ACTION_BUTTON_CLASS =
	'rounded-md px-3 py-1.5 font-body font-medium text-sm bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]'

// Fisher-Yates. 컴포넌트(브라우저)에서만 도니 Math.random 사용 OK.
function shuffle<T>(list: T[]): T[] {
	const next = [...list]
	for (let i = next.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[next[i], next[j]] = [next[j], next[i]]
	}
	return next
}

/**
 * 아이콘 그리드 뷰(뷰어 인터랙션: 태그 필터·색상 반전·랜덤 섞기).
 * 아이콘/색 데이터는 서버(블록)가 brand-icons + 정적 colorway로 조립해 props로 내려준다.
 * 흑백은 LBS 디자인 토큰(foreground/background), 컬러는 colorway가 준 팔레트 hex를 CSS mask로 칠한다.
 */
export function IconGridView({
	items,
	colored,
	heightPct,
	svgPct,
	offsetPct,
}: {
	items: IconGridItem[]
	colored: boolean
	heightPct: number
	svgPct: number
	offsetPct: number
}) {
	const groups = useMemo(() => [...new Set(items.map((i) => i.group).filter(Boolean))], [items])
	// ToggleGroup이 선택 목록을 배열로 주고 받는다 — Set으로 들고 있으면 매번 변환만 오간다.
	const [selected, setSelected] = useState<string[]>([])
	// 0 = 원래 순서, >0 = 클릭할 때마다 새로 섞기
	const [shuffleSeed, setShuffleSeed] = useState(0)
	const [inverted, setInverted] = useState(false) // 전경↔배경 스왑

	const visible = useMemo(() => {
		const filtered =
			selected.length === 0 ? items : items.filter((i) => selected.includes(i.group))
		return shuffleSeed > 0 ? shuffle(filtered) : filtered
	}, [items, selected, shuffleSeed])

	// 컬러 = colorway 팔레트 hex. 흑백 = 카드 서페이스 토큰(--card: 라이트 순백/다크 카드색)이라
	// soft한 페이지 배경(--background)과 구분된다. inverted면 전경/배경 스왑.
	const cellColors = (it: IconGridItem) => {
		const fg = colored ? (it.fgHex ?? 'var(--card-foreground)') : 'var(--card-foreground)'
		const bg = colored ? (it.bgHex ?? 'var(--card)') : 'var(--card)'
		return inverted ? { fg: bg, bg: fg } : { fg, bg }
	}

	return (
		<div className="flex size-full min-h-0 min-w-0 flex-col">
			{/* 뷰어 조작 — 필터(태그)는 왼쪽, 보기 액션(반전·섞기)은 오른쪽 도구 클러스터로 분리 */}
			<div className="mb-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
				<div className="flex flex-wrap items-center gap-2">
					{/*
						여러 그룹을 동시에 켜는 필터라 type="multiple"이다(Radix가 toolbar로 렌더한다).
						테두리형이라 오른쪽의 채운 액션 버튼과 구분된다 — 필터는 상태를 갖고, 액션은 한 번 눌린다.
					*/}
					<ToggleGroup
						type="multiple"
						variant="outline"
						value={selected}
						onValueChange={setSelected}
						className="flex-wrap"
						aria-label="아이콘 그룹 필터"
					>
						{groups.map((g) => (
							<ToggleGroupItem key={g} value={g} className="px-3">
								{g}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					{selected.length > 0 && (
						<button
							type="button"
							onClick={() => setSelected([])}
							className={ACTION_BUTTON_CLASS}
						>
							전체
						</button>
					)}
				</div>
				<div className="flex items-center gap-2">
					{shuffleSeed > 0 && (
						<button
							type="button"
							onClick={() => setShuffleSeed(0)}
							className={ACTION_BUTTON_CLASS}
						>
							순서 복원
						</button>
					)}
					<button
						type="button"
						onClick={() => setShuffleSeed((s) => s + 1)}
						className={`inline-flex items-center gap-1.5 ${ACTION_BUTTON_CLASS}`}
					>
						<Shuffle size={16} />
						랜덤 섞기
					</button>
					<Switch
						id="icon-grid-inverted"
						checked={inverted}
						onCheckedChange={setInverted}
					/>
					<Label
						htmlFor="icon-grid-inverted"
						className="inline-flex items-center gap-1.5 font-body font-medium text-sm"
					>
						<Contrast size={16} />
						색상 반전
					</Label>
				</div>
			</div>

			{/* 8열 그리드 — border/radius 없음. SVG는 CSS mask로 그려 fg(실루엣)·bg를 색칠. */}
			<div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-4 gap-2 sm:grid-cols-8">
				{visible.map((it) => {
					const { fg, bg } = cellColors(it)
					return (
						<motion.div
							key={it.id}
							layout
							whileHover={{ scale: 1.04 }}
							transition={{ type: 'spring', stiffness: 500, damping: 40 }}
							className="group relative flex flex-col p-2"
							style={{ backgroundColor: bg }}
						>
							{/* order — 항상 좌상단. 색은 아이콘 색(fg)과 동일. */}
							<span
								className="absolute top-2 left-2 z-10 font-body text-xs"
								style={{ color: fg }}
							>
								{it.n}
							</span>
							<div
								className="relative w-full"
								style={{
									aspectRatio: `100 / ${heightPct}`,
									containerType: 'inline-size',
								}}
							>
								<div
									role="img"
									aria-label={it.name}
									className="absolute top-1/2 left-1/2 transition-[background-color] duration-300"
									style={{
										width: `${svgPct}%`,
										aspectRatio: it.ratio,
										transform: `translate(-50%, -50%) translateY(${offsetPct}cqw)`,
										backgroundColor: fg,
										maskImage: `url(${it.src})`,
										maskRepeat: 'no-repeat',
										maskPosition: 'center',
										maskSize: 'contain',
										WebkitMaskImage: `url(${it.src})`,
										WebkitMaskRepeat: 'no-repeat',
										WebkitMaskPosition: 'center',
										WebkitMaskSize: 'contain',
									}}
								/>
							</div>
							{/* name — 좌하단, hover 시에만. 색은 아이콘 색(fg)과 동일.
							    나타남은 빠르게(150ms), 사라짐은 느리게(700ms): base duration을 길게,
							    hover 상태 duration을 짧게 둬 비대칭 트랜지션을 만든다. */}
							<span
								className="absolute bottom-2 left-2 z-10 font-body text-xs opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-hover:duration-150"
								style={{ color: fg }}
							>
								{it.name}
							</span>
						</motion.div>
					)
				})}
			</div>
		</div>
	)
}
