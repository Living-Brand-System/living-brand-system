'use client'

import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { BrandBackground } from '../../../../displays/dynamics/brand-background'
import type { LogoSources } from '../../../../displays/dynamics/logo-set'
import { MONO_FILL } from '../../../../displays/dynamics/surface'

// 한 배경 위에 CI 두 표현을 나란히 올리고, 구석의 색 띠를 끌어 배경을 갈아 끼운다.
// 컨트롤이 하나라 두 표현이 같은 배경에서 어떻게 갈리는지가 한눈에 보인다 — 드래그 위젯이 열을
// 나눠 놓아서 못 하던 것이다.

/**
 * 로고 상자 = 판 폭의 1/3. 두 표현이 **같은 상자**를 쓰고 둘 다 contain으로 맞아야 크기가 같아진다
 * — 한쪽만 고정 높이를 주면 방향이 다른 로고에서 크기가 갈린다(78×95 대 22×64로 갈렸었다).
 *
 * 🔴 `%`가 아니라 `cqw`인 이유: 상자는 2열 그리드의 셀 안에 있어서 `%`는 판이 아니라 셀(판의 절반)을
 *    기준으로 잡는다. 그러면 1/3이 1/6이 된다. 판을 컨테이너로 선언하고 판 기준으로 잰다.
 */
const LOGO_BOX_WIDTH = '33.333cqw'
/**
 * 두 상자가 반드시 같은 클래스·스타일을 써야 크기가 안 갈린다.
 *
 * 🔴 행 트랙을 `minmax(0, 1fr)`로 확정해야 한다. 기본 `auto` 트랙은 내용만큼 부풀어서 안쪽 `size-full`이
 *    걸릴 높이가 사라지고, 로고가 상자를 뚫고 나온다(310px 상자에 479px 이미지가 들어찼다).
 * 🔴 그리고 그걸 **인라인 스타일로** 준다 — Tailwind 임의값 클래스(`grid-rows-[minmax(0,1fr)]`)는
 *    CSS가 생성되지 않아 트랙이 그대로 479px로 남았다(실측).
 */
const LOGO_BOX_CLASS = 'grid h-full place-items-center'
const LOGO_BOX_STYLE = {
	width: LOGO_BOX_WIDTH,
	gridTemplateRows: 'minmax(0, 1fr)',
} as const
/** 색 띠가 차지하는 아래쪽 영역. 로고가 띠를 침범하지 않게 이만큼 비운다. */
const STRIP_CLEARANCE = '3.5rem'

export function LogoBgPickerView({
	backgrounds,
	logos,
}: {
	backgrounds: BrandBackground[]
	logos: LogoSources
}) {
	const [index, setIndex] = useState(0)
	// 🔴 드래그 여부는 ref가 정본이다. state로 판정하면 pointerdown과 같은 틱에 들어온 첫 pointermove가
	//    아직 false인 값을 보고 그냥 버려진다(logo-on-background에서 실제로 밟았다).
	const draggingRef = useRef(false)
	const stripRef = useRef<HTMLDivElement>(null)

	const background = backgrounds[Math.min(index, backgrounds.length - 1)]
	if (!background) return null

	const foreground = MONO_FILL[background.monoFill]
	const fullColorSrc = pickFullColor(background, logos)

	/** 띠 위 x좌표를 색 순번으로 바꾼다. 칸이 아니라 띠 전체 폭으로 나눠 경계에서 끊기지 않는다. */
	function indexAt(clientX: number) {
		const rect = stripRef.current?.getBoundingClientRect()
		if (!rect) return index
		const raw = Math.floor(((clientX - rect.left) / rect.width) * backgrounds.length)
		return Math.max(0, Math.min(backgrounds.length - 1, raw))
	}

	function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		// 캡처는 포인터가 띠 밖으로 나가도 계속 따라오게 하는 것뿐이라, 실패해도 드래그는 이어져야 한다.
		try {
			event.currentTarget.setPointerCapture(event.pointerId)
		} catch {
			// 활성 포인터가 아니면 던진다 — 무시하고 진행한다.
		}
		draggingRef.current = true
		setIndex(indexAt(event.clientX))
	}

	return (
		<div className="flex size-full min-h-0 min-w-0 flex-col gap-2">
			<div
				className="relative min-h-0 w-full flex-1 overflow-clip border border-border transition-colors"
				style={{
					backgroundColor: background.hex,
					// 로고 상자가 셀이 아니라 판을 기준으로 크기를 잡게 한다(LOGO_BOX_WIDTH 주석 참고).
					containerType: 'size',
				}}
			>
				{/* CI 두 표현. 같은 배경·같은 상자를 공유하므로 규정 차이만 드러난다. */}
				<div
					className="absolute inset-x-0 top-0 grid grid-cols-2 place-items-center"
					style={{
						bottom: STRIP_CLEARANCE,
						// 🔴 행 트랙을 확정한다. 기본 `auto` 트랙은 내용만큼 부풀어서, 로고 상자의 `h-full`이
						//    걸릴 높이가 없어지고 트랙이 판 밖으로 넘친다(310px 자리에 479px가 들어찼다).
						gridTemplateRows: 'minmax(0, 1fr)',
					}}
				>
					<div className={LOGO_BOX_CLASS} style={LOGO_BOX_STYLE}>
						{fullColorSrc ? (
							// biome-ignore lint/performance/noImgElement: Payload upload URL이라 next/image 미사용.
							<img
								src={fullColorSrc}
								alt=""
								draggable={false}
								// size-full이라 preflight의 `img{max-width:100%}`에 걸리지 않는다.
								className="size-full object-contain"
							/>
						) : (
							<Forbidden foreground={foreground} />
						)}
					</div>

					<div className={LOGO_BOX_CLASS} style={LOGO_BOX_STYLE}>
						{logos.mono ? (
							<div
								role="img"
								aria-label="CI 단색분리형"
								// 단색형은 fill 속성이 없는 실루엣이라 mask로 색을 입힌다.
								// 🔴 색 파생이 아니다 — 단색형은 원래 한 색이고 그 색을 규정이 정해준다.
								className="size-full"
								style={{
									backgroundColor: foreground,
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
						) : null}
					</div>
				</div>

				{/*
					색 띠 — 칸 사이 간격 없이 붙여 하나의 띠로 읽히게 하고, 그 위를 끌어 배경을 바꾼다.
					등록된 색만 있으므로 어느 지점을 짚어도 규정이 있는 색이다.
				*/}
				{/*
					배경 하나를 고르는 것이므로 type="single"이다 — Radix가 radiogroup/radio로 렌더해
					"이 중 하나"가 AT에 전달되고, 색 칸 전체가 탭 스톱 하나 + 화살표 이동이 된다.
					🔴 대신 프리미티브의 박스는 눌러 둔다(`gap-0`·칸의 radius/padding 제거) — 이 띠는
					   분절된 세그먼트 컨트롤이 아니라 끊김 없이 끌고 지나가는 한 줄의 색 램프다.
					   채색과 선택 테두리는 클래스가 아니라 브랜드 데이터(hex·대비 전경색)에서 온다.
				*/}
				<ToggleGroup
					type="single"
					value={String(index)}
					onValueChange={(next) => next && setIndex(Number(next))}
					aria-label="배경색"
					ref={stripRef}
					onPointerDown={onPointerDown}
					onPointerMove={(event) => {
						if (draggingRef.current) setIndex(indexAt(event.clientX))
					}}
					onPointerUp={() => {
						draggingRef.current = false
					}}
					onPointerCancel={() => {
						draggingRef.current = false
					}}
					className="absolute right-3 bottom-3 cursor-grab gap-0 overflow-hidden rounded-none active:cursor-grabbing"
					// 터치에서 가로 스크롤에 뺏기지 않게 한다.
					style={{ touchAction: 'none', boxShadow: `0 0 0 1px ${foreground}33` }}
				>
					{backgrounds.map((candidate, i) => (
						<ToggleGroupItem
							key={candidate.id}
							value={String(i)}
							aria-label={`${candidate.name} 배경으로 보기`}
							title={`${candidate.name} · ${candidate.hex}`}
							// 🔴 포인터는 띠가 통째로 받는다. 칸이 포인터를 가로채면 드래그가 칸 경계마다 끊긴다.
							//    키보드 포커스와 Enter/Space는 pointer-events와 무관하게 그대로 동작한다.
							className="pointer-events-none h-6 w-7 min-w-0 rounded-none p-0"
							style={{
								backgroundColor: candidate.hex,
								boxShadow:
									i === index ? `inset 0 0 0 2px ${foreground}` : undefined,
							}}
						/>
					))}
				</ToggleGroup>
			</div>
		</div>
	)
}

/**
 * 배경이 정한 대로 기본형 → WHITE 워드마크 순으로 고른다. 둘 다 불가면 null이다.
 * 어느 쪽이 쓰였는지를 화면에 글로 쓰지 않는다 — 판 위에는 CI만 둔다.
 */
function pickFullColor(background: BrandBackground, logos: LogoSources) {
	if (background.allowsFullColor) return logos.default
	if (background.allowsWhiteWordmark) return logos.white
	return null
}

/** 이 배경에는 올릴 수 있는 기본형 계열이 없다. 규정이 금지라는 사실 자체가 정보다. */
function Forbidden({ foreground }: { foreground: string }) {
	return (
		<span
			role="img"
			aria-label="이 배경에는 사용할 수 없습니다"
			className="grid size-16 place-items-center font-body text-xl"
			style={{ color: foreground, boxShadow: `inset 0 0 0 1px ${foreground}` }}
		>
			✕
		</span>
	)
}
