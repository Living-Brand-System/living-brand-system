'use client'

import {
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from 'react'
import { WIDGET_CAPTION } from '../../../../displays/dynamics/readout'

/**
 * 로고 클리어스페이스 = N·A. A(unit) = 워드마크의 수직 줄기 두께.
 *
 * 측정과 렌더를 분리한다:
 *  - StemMeasure: admin authoring에서 줄기를 클릭해 A를 로고 폭 대비 비율(0~1)과 위치로 산출한다.
 *    원본 SVG를 고해상도로 래스터화해 측정하므로 표시 크기·해상도와 무관하다(1회 authoring).
 *  - ClearSpaceView: 저장된 비율로 클리어스페이스를 그린다. 측정 로직 없이 로고 크기 조절·가이드
 *    토글만 제공한다. A = stemRatio × 표시폭이라 크기를 바꿔도 여백이 비례한다. N(배수)은 author 고정값.
 *
 * 브랜드 무관: 로고(url)·비율·위치·배수·틴트 전부 데이터로 주입.
 */

/** 줄기 측정 결과 — 전부 로고 폭 대비 비율(0~1)이라 표시 크기·해상도와 무관하다. */
export type StemMeasurement = {
	/** 줄기 두께 ÷ 로고 폭 = A 비율. */
	ratio: number
	/** 줄기 왼쪽 모서리 ÷ 로고 폭 = 위치. */
	x: number
}

// 원본이 SVG(벡터)이므로 표시 크기와 무관하게 고정 고해상도로 래스터화해 측정 정밀도를 확보한다.
// 렌더된 요소(~8~9px)를 재면 오차가 크지만, 벡터를 이 폭으로 그리면 선명하고 비율(두께÷폭)은 해상도 불변이다.
const SCAN_W = 2400
// same-origin 에셋이라 canvas 픽셀 읽기가 막히지 않는다.
function rasterize(logo: string, onReady: (px: Uint8ClampedArray, w: number, h: number) => void) {
	const img = new Image()
	img.crossOrigin = 'anonymous'
	img.onload = () => {
		const aspect =
			img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 4.8
		const w = SCAN_W
		const h = Math.max(1, Math.round(SCAN_W / aspect))
		const c = document.createElement('canvas')
		c.width = w
		c.height = h
		const ctx = c.getContext('2d')
		if (!ctx) return
		ctx.drawImage(img, 0, 0, w, h)
		try {
			onReady(ctx.getImageData(0, 0, w, h).data, w, h)
		} catch {
			/* cross-origin 오염 등 — 측정 불가, 폴백 비율 사용 */
		}
	}
	img.src = logo
}

/**
 * 줄기 측정 위젯 — admin 필드의 코어. 로고 위 한 점을 클릭하면 그 세로 위치 주변 여러 행에서
 * 잉크 연속 구간의 폭을 median으로 재 두께·위치를 로고 폭 대비 비율로 onChange 한다.
 */
export function StemMeasure({
	logo,
	value,
	onChange,
}: {
	logo: string
	/** 저장된 측정값 또는 null(미측정). */
	value: StemMeasurement | null
	onChange: (stem: StemMeasurement) => void
}) {
	const pixels = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null)
	const [ready, setReady] = useState(false)

	useEffect(() => {
		setReady(false)
		pixels.current = null
		rasterize(logo, (data, w, h) => {
			pixels.current = { data, w, h }
			setReady(true)
		})
	}, [logo])

	function measureAt(event: ReactPointerEvent<HTMLButtonElement>) {
		const p = pixels.current
		if (!p) return
		const rect = event.currentTarget.getBoundingClientRect()
		const cx = Math.round(((event.clientX - rect.left) / rect.width) * p.w)
		const cy = Math.round(((event.clientY - rect.top) / rect.height) * p.h)
		if (cx < 0 || cx >= p.w || cy < 0 || cy >= p.h) return
		const ink = (x: number, y: number) => p.data[(y * p.w + x) * 4 + 3] > 40
		if (!ink(cx, cy)) return // 빈 곳 클릭 — 무시
		// 클릭 지점 ±band 행에서 잉크 연속 구간을 재고 두께 중앙값을 취한다.
		// 세리프·글자 교차부에 살짝 빗나가도 median이라 안정적이다.
		const band = Math.max(2, Math.round(p.h * 0.02))
		const runs: { w: number; left: number }[] = []
		for (let y = Math.max(0, cy - band); y <= Math.min(p.h - 1, cy + band); y++) {
			if (!ink(cx, y)) continue
			let left = cx
			let right = cx
			while (left - 1 >= 0 && ink(left - 1, y)) left--
			while (right + 1 < p.w && ink(right + 1, y)) right++
			runs.push({ w: right - left + 1, left })
		}
		if (!runs.length) return
		runs.sort((a, b) => a.w - b.w)
		const mid = runs[Math.floor(runs.length / 2)]
		onChange({ ratio: mid.w / p.w, x: mid.left / p.w })
	}

	return (
		<div className="flex w-full flex-col gap-2">
			{/* 프레임/패딩은 바깥 div가 갖고, 클릭 버튼은 이미지를 딱 감싼다.
			    measureAt이 버튼 rect를 로고 픽셀에 매핑하므로 버튼 박스 == 이미지 박스여야 한다. */}
			{/* 뷰잉 패널: 상하 패딩으로 로고 위아래 여백 확보. overflow-hidden으로 아래 사각형을 패널 높이에 맞춰 클립. */}
			<div className="relative grid min-h-40 w-full place-items-center overflow-hidden rounded-lg border border-border bg-background px-8 py-14">
				<button
					type="button"
					onClick={measureAt}
					disabled={!ready}
					title="세로 줄기를 클릭해 A를 실측"
					// 🔴 이름을 직접 준다 — 안의 로고 img alt가 이름이 되면 "로고"로 읽혀서
					//    무엇을 하는 버튼인지 사라진다. 동작 설명은 title에만 있었다.
					aria-label="세로 줄기를 클릭해 A를 실측"
					className="relative inline-block cursor-crosshair p-0 leading-none disabled:cursor-wait"
				>
					{/* biome-ignore lint/performance/noImgElement: 원격 svg라 next/image 대신 img 사용. */}
					<img src={logo} alt="로고" className="pointer-events-none block h-16 w-auto" />
					{/* 측정된 줄기를 판과 같은 면(bg-background)의 무테 사각형으로 덮는다 — 클릭한 줄기와 정확히 겹치면 측정이 맞다.
					    좌/폭은 로고 폭 대비 %라 정확히 정렬(계산은 SVG 픽셀 기준). 높이는 top/bottom을 크게 잡아
					    패널 overflow-hidden이 패널 전체 높이로 클립한다. 재클릭 방해 없도록 pointer-events-none. */}
					{value && (
						<div
							className="pointer-events-none absolute bg-background"
							style={{
								top: -1000,
								bottom: -1000,
								left: `${value.x * 100}%`,
								width: `${value.ratio * 100}%`,
							}}
						/>
					)}
				</button>
			</div>
			<p className={WIDGET_CAPTION}>
				로고의 <b>수직 줄기</b>를 클릭하면 A를 실측합니다. 현재 A ={' '}
				<b className="tabular-nums">
					{value == null
						? '미측정'
						: `두께 ${(value.ratio * 100).toFixed(2)}% · 위치 ${(value.x * 100).toFixed(0)}%`}
				</b>
			</p>
		</div>
	)
}

/**
 * 클리어스페이스 뷰어(공개 가이드라인) — 저장된 stemRatio/stemX로 정해진 N·A 여백을 그대로 보여준다.
 * 공개 페이지는 정보 전달용이라 조작 컨트롤(슬라이더·토글)이 없다. 렌더는 벡터 SVG 그대로.
 * N(배수)과 A(줄기 두께·위치)는 전부 admin에서 정해진 값이므로 뷰어는 읽어서 그리기만 한다.
 */
export function ClearSpaceView({
	logoSrc,
	stemRatio,
	stemX,
	multiplier = 3,
	tint = '120 120 120',
	fallbackAspect = 891 / 185,
}: {
	logoSrc: string
	/** 로고 폭 대비 A 비율(0~1). admin에서 측정·저장된 값. */
	stemRatio: number
	/** 줄기 왼쪽 모서리 위치(로고 폭 대비 0~1). 없으면 중앙에 표시. */
	stemX?: number
	/** 여백 배수 N(N·A). author 고정값. */
	multiplier?: number
	/** 틴트 색 "r g b". */
	tint?: string
	/** 로고 종횡비 폴백(로드 전). */
	fallbackAspect?: number
}) {
	const [aspect, setAspect] = useState(fallbackAspect)

	useEffect(() => {
		const img = new Image()
		img.onload = () => {
			if (img.naturalWidth && img.naturalHeight)
				setAspect(img.naturalWidth / img.naturalHeight)
		}
		img.src = logoSrc
	}, [logoSrc])

	const n = multiplier
	const logoW = 1
	const logoH = 1 / aspect
	const a = stemRatio * logoW
	const margin = n * a
	const outerW = logoW + margin * 2
	const outerH = logoH + margin * 2
	const color = `rgb(${tint})`
	// A 기준 사각형 — 측정된 줄기 위치(stemX)에 폭 A로 얹는다. 없으면 로고 중앙.
	const aLeft = stemX != null ? margin + stemX * logoW : margin + (logoW - a) / 2

	return (
		<div className="flex size-full min-h-0 min-w-0 flex-col gap-3 overflow-clip">
			<div
				className="grid size-full min-h-0 min-w-0 place-items-center rounded-lg border border-border bg-background p-8"
				style={{ containerType: 'size' }}
			>
				<div
					className="relative shrink-0"
					style={
						{
							'--clearspace-unit': `min(calc(100cqw / ${outerW}), calc(100cqh / ${outerH}))`,
							width: `calc(${outerW} * var(--clearspace-unit))`,
							height: `calc(${outerH} * var(--clearspace-unit))`,
						} as CSSProperties
					}
				>
					{/* 4개 padding 사각형 — 그룹 opacity로 코너에서 겹쳐도 색이 진해지지 않는다. */}
					<div className="absolute inset-0" style={{ opacity: 0.14 }}>
						<div
							className="absolute top-0 right-0 left-0"
							style={{
								height: `calc(${margin} * var(--clearspace-unit))`,
								background: color,
							}}
						/>
						<div
							className="absolute right-0 bottom-0 left-0"
							style={{
								height: `calc(${margin} * var(--clearspace-unit))`,
								background: color,
							}}
						/>
						<div
							className="absolute top-0 bottom-0 left-0"
							style={{
								width: `calc(${margin} * var(--clearspace-unit))`,
								background: color,
							}}
						/>
						<div
							className="absolute top-0 right-0 bottom-0"
							style={{
								width: `calc(${margin} * var(--clearspace-unit))`,
								background: color,
							}}
						/>
					</div>

					{/* 코너 NA 라벨 */}
					{(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
						<span
							key={pos}
							className="absolute grid font-body font-medium text-xs"
							style={{
								width: `calc(${margin} * var(--clearspace-unit))`,
								height: `calc(${margin} * var(--clearspace-unit))`,
								placeItems: 'center',
								top: pos[0] === 't' ? 0 : undefined,
								bottom: pos[0] === 'b' ? 0 : undefined,
								left: pos[1] === 'l' ? 0 : undefined,
								right: pos[1] === 'r' ? 0 : undefined,
								color,
							}}
						>
							{n}A
						</span>
					))}

					{/* A 기준 사각형(폭=A, 높이=전체) — 단위 크기를 보여준다. */}
					<div
						className="absolute top-0 z-10"
						style={{
							left: `calc(${aLeft} * var(--clearspace-unit))`,
							width: `calc(${a} * var(--clearspace-unit))`,
							height: `calc(${outerH} * var(--clearspace-unit))`,
							border: `1px solid ${color}`,
						}}
					/>
					<span
						className="absolute top-1 z-10 -translate-x-1/2 px-1 font-body font-semibold text-xs leading-none"
						style={{
							left: `calc(${aLeft + a / 2} * var(--clearspace-unit))`,
							color,
							background: 'var(--background)',
						}}
					>
						A
					</span>

					{/* 로고 */}
					<div
						className="absolute bg-background"
						style={{
							top: `calc(${margin} * var(--clearspace-unit))`,
							left: `calc(${margin} * var(--clearspace-unit))`,
							width: `calc(${logoW} * var(--clearspace-unit))`,
							height: `calc(${logoH} * var(--clearspace-unit))`,
							outline: `1px dashed rgb(${tint} / 0.55)`,
						}}
					>
						{/* biome-ignore lint/performance/noImgElement: 원격 svg라 next/image 미사용. */}
						<img src={logoSrc} alt="로고" className="size-full object-contain" />
					</div>
				</div>
			</div>
		</div>
	)
}
