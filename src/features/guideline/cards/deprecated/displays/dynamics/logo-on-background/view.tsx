'use client'

import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import type { BrandBackground as Band } from '../../../../displays/dynamics/brand-background'
import type { LogoSources } from '../../../../displays/dynamics/logo-set'
import { MONO_FILL } from '../../../../displays/dynamics/surface'

// 드래그로 배경을 갈아 끼우는 로고. 세로로만 움직이고 놓으면 띠 가운데로 붙는다 —
// 판정 기준이 "어느 띠 위인가"라서 띠 경계에 걸친 애매한 위치가 없는 편이 낫다.
export function LogoOnBackgroundView({
	bands,
	logos,
	column,
}: {
	bands: Band[]
	logos: LogoSources
	column: 'fullColor' | 'mono'
}) {
	const [index, setIndex] = useState(() =>
		Math.min(bands.length - 1, Math.floor(bands.length / 2)),
	)
	// 🔴 드래그 여부는 ref가 정본이고 state는 커서 모양에만 쓴다. state로 판정하면 pointerdown과
	//    같은 틱에 들어온 첫 pointermove가 아직 false인 값을 보고 그냥 버려진다.
	const draggingRef = useRef(false)
	const [dragging, setDragging] = useState(false)
	const trackRef = useRef<HTMLDivElement>(null)

	function setDrag(on: boolean) {
		draggingRef.current = on
		setDragging(on)
	}

	const band = bands[index]

	function bandAt(clientY: number) {
		const rect = trackRef.current?.getBoundingClientRect()
		if (!rect?.height) return index
		const raw = Math.floor(((clientY - rect.top) / rect.height) * bands.length)
		return Math.max(0, Math.min(bands.length - 1, raw))
	}

	function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		// 캡처는 포인터가 띠 밖으로 나가도 계속 따라오게 하는 것뿐이라, 실패해도 드래그는 이어져야 한다.
		try {
			event.currentTarget.setPointerCapture(event.pointerId)
		} catch {
			// 활성 포인터가 아니면 던진다 — 무시하고 진행한다.
		}
		setDrag(true)
		setIndex(bandAt(event.clientY))
	}

	function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
		if (!draggingRef.current) return
		setIndex(bandAt(event.clientY))
	}

	if (!band) return null

	return (
		<div className="flex size-full min-h-0 min-w-0 flex-col gap-2">
			<div
				ref={trackRef}
				className="relative flex min-h-0 w-full flex-1 select-none flex-col overflow-clip border border-border"
			>
				{bands.map((b) => (
					<div
						key={b.id}
						className="flex min-h-0 flex-1 items-center px-4 font-body text-xs"
						style={{
							backgroundColor: b.hex,
							color: MONO_FILL[b.monoFill],
						}}
					>
						<span className="opacity-70">{b.name}</span>
					</div>
				))}

				{/* 로고 — 띠 위에 절대배치하고 세로로만 끌린다. */}
				<div
					role="slider"
					tabIndex={0}
					aria-label="로고를 위아래로 옮겨 배경색을 바꿉니다"
					aria-valuemin={1}
					aria-valuemax={bands.length}
					aria-valuenow={index + 1}
					aria-valuetext={band.name}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={() => setDrag(false)}
					onPointerCancel={() => setDrag(false)}
					onKeyDown={(event) => {
						if (event.key === 'ArrowDown')
							setIndex((i) => Math.min(bands.length - 1, i + 1))
						if (event.key === 'ArrowUp') setIndex((i) => Math.max(0, i - 1))
					}}
					className={`absolute inset-x-0 grid cursor-grab place-items-center outline-none ring-foreground/60 focus-visible:ring-2 ${
						dragging ? 'cursor-grabbing' : ''
					}`}
					style={{
						height: `${100 / bands.length}%`,
						top: `${(index / bands.length) * 100}%`,
						transition: dragging ? undefined : 'top 120ms ease-out',
						// 터치에서 세로 스크롤에 뺏기지 않게 한다. 없으면 모바일에서 드래그 대신 페이지가 스크롤된다.
						touchAction: 'none',
					}}
				>
					{/* 🔴 로고는 인터랙션에 관여하지 않는다. pointer-events를 끄지 않으면 안에 무엇이
					    들어가느냐에 따라 드래그가 되고 안 되고가 갈린다 — 실제로 `<img>`(기본형·WHITE)는
					    브라우저 기본 드래그가 먼저 잡아채 pointer capture를 취소시켜 안 움직였고,
					    mask `<div>`(단색형)만 움직였다. 여기서 한 번 끄면 종류를 안 타게 된다. */}
					<div className="pointer-events-none">
						<LogoMark band={band} logos={logos} column={column} />
					</div>
				</div>
			</div>
		</div>
	)
}

function LogoMark({
	band,
	logos,
	column,
}: {
	band: Band
	logos: LogoSources
	column: 'fullColor' | 'mono'
}) {
	if (column === 'mono') {
		// 단색형은 fill 속성이 없는 실루엣이라 mask로 색을 입힌다.
		// 🔴 이건 색 파생이 아니다 — 단색형은 원래 한 색이고, 그 색을 규정이 정해준다.
		if (!logos.mono) return null
		const color = MONO_FILL[band.monoFill]
		return (
			<div
				role="img"
				aria-label={`단색분리형 (${band.monoFill === 'black' ? '검정' : '흰색'})`}
				className="h-9 w-40"
				style={{
					backgroundColor: color,
					maskImage: `url(${logos.mono})`,
					maskRepeat: 'no-repeat',
					maskPosition: 'center',
					maskSize: 'contain',
					WebkitMaskImage: `url(${logos.mono})`,
					WebkitMaskRepeat: 'no-repeat',
					WebkitMaskPosition: 'center',
					WebkitMaskSize: 'contain',
				}}
			/>
		)
	}

	// 기본형 계열은 파일을 갈아 끼운다. 둘 다 못 쓰는 배경이면 금지 표시를 낸다.
	const src = band.allowsFullColor ? logos.default : band.allowsWhiteWordmark ? logos.white : null
	if (!src) return <Forbidden />
	return (
		// biome-ignore lint/performance/noImgElement: Payload upload URL이라 next/image 미사용.
		<img
			src={src}
			alt={band.allowsFullColor ? 'CI 기본형' : 'CI WHITE 워드마크'}
			// 부모가 pointer-events를 끄지만 draggable도 함께 끈다 — 키보드 포커스나 확대 상태에서
			// 브라우저가 이미지 드래그를 시작할 여지를 남기지 않는다.
			draggable={false}
			className="h-9 w-auto max-w-none"
		/>
	)
}

/** 이 배경에는 올릴 수 있는 로고가 없다(Primary 4색). 규정이 금지라는 사실 자체가 정보다. */
function Forbidden() {
	return (
		<span
			// ✕는 장식이 아니라 "쓸 수 없다"는 정보라 라벨이 필요하다. 라벨을 붙이려면 role이 있어야 한다
			// (span은 aria-label을 지원하지 않는다) — 같은 표식을 쓰는 logo-bg-picker와 맞춘다.
			role="img"
			aria-label="이 배경에는 사용할 수 없습니다"
			className="grid size-9 place-items-center bg-destructive/15 font-body text-base text-destructive"
		>
			✕
		</span>
	)
}
