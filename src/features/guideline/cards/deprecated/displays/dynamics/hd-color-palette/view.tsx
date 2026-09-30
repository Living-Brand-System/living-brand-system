'use client'

import { useState } from 'react'
import { getContrastingForeground, hexToRgb, isValidHex } from '@/lib/color'
import { copyText } from '../../../../displays/dynamics/hd-color-palette/copy'

export type PaletteSwatch = {
	id: string
	name: string
	hex: string
	cmyk?: string | null
	pantone?: string | null
}

export type PaletteLayout = 'uniform' | 'ranked'

// 클릭하면 HEX를 복사하는 스와치. admin의 스와치 셀과 동작이 겹치지만 공유하지 않는다 —
// 표면마다 판형·인터랙션이 달라 한쪽을 고치면 다른 쪽이 같이 변형된다.
export function HdColorPaletteView({
	swatches,
	layout,
	/** 균일 판형에서 모든 칸을 같은 크기로 만들기 위한 열 수. 위젯 안 최다 색 수다. */
	columnCount,
}: {
	swatches: PaletteSwatch[]
	layout: PaletteLayout
	columnCount: number
}) {
	// 🔴 `1fr`은 `minmax(auto, 1fr)`이라 내용이 넓으면 안 줄어든다. `minmax(0, 1fr)`로 써야 균등해진다.
	//
	// 균일: 열 수를 위젯 전체의 최다 색 수로 고정한다. 그래야 색이 3개인 계열과 6개인 계열의 칸이
	//       같은 크기가 된다 — 색 수로 나누면 적은 계열일수록 칸이 커져 중요도가 있는 것처럼 읽힌다.
	//       모자란 칸은 채우지 않고 오른쪽을 비운다.
	// 위계: 행이 폭을 100% 채우고, 높이가 순위를 말한다.
	const columns = layout === 'uniform' ? columnCount : swatches.length

	return (
		<div
			className="grid min-h-0 w-full flex-1"
			style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
		>
			{swatches.map((swatch) => (
				<Swatch key={swatch.id} swatch={swatch} />
			))}
		</div>
	)
}

function Swatch({ swatch }: { swatch: PaletteSwatch }) {
	const [copied, setCopied] = useState(false)
	// hex가 깨진 데이터면 파생 계산이 던지므로 색면을 포기하고 텍스트만 남긴다.
	const valid = isValidHex(swatch.hex)
	const rgb = valid ? hexToRgb(swatch.hex) : null
	const surface = valid
		? { backgroundColor: swatch.hex, color: getContrastingForeground(swatch.hex) }
		: undefined

	async function copy() {
		// 성공했을 때만 "복사됨" 표시 — 거짓 피드백 방지(프리뷰 iframe은 clipboard 권한이 없다).
		if (await copyText(swatch.hex)) {
			setCopied(true)
			setTimeout(() => setCopied(false), 1200)
		}
	}

	return (
		<button
			type="button"
			onClick={copy}
			title={`${swatch.hex} 복사`}
			className="group relative flex min-h-0 min-w-0 cursor-pointer flex-col justify-between gap-1 p-2 text-left font-body text-xs leading-tight outline-none ring-foreground/60 transition-transform hover:z-20 hover:scale-105 focus-visible:z-20 focus-visible:ring-2"
			style={surface}
		>
			<span className="font-medium">{copied ? '✓ 복사됨' : swatch.name}</span>

			{/*
				한 목록에 네 값을 순서대로 둔다. 인쇄값(CMYK·PMS)은 평소 접혀 있다가 hover에서 펴지며,
				칸 아래가 아니라 **HEX·RGB 위로** 자란다 — 목록이 바닥에 붙어 있어 위로 밀린다.
				값이 없는 줄도 라벨을 남긴다 — 브랜드팀에서 아직 안 온 항목이 화면에서 보이게.
			*/}
			<dl className="grid grid-cols-[2.75rem_1fr] tabular-nums">
				<Spec label="CMYK" value={swatch.cmyk} foldable />
				<Spec label="PMS" value={swatch.pantone} foldable />
				<Spec label="HEX" value={swatch.hex} />
				<Spec label="RGB" value={rgb && `${rgb.r} ${rgb.g} ${rgb.b}`} />
			</dl>
		</button>
	)
}

/**
 * 한 줄. `foldable`이면 평소 자리를 차지하지 않다가 hover·포커스에서 펴진다.
 * 🔴 `dt`·`dd`가 각각 그리드 항목이라 둘 다 접어야 한다 — 하나만 접으면 열이 밀려 어긋난다.
 */
function Spec({
	label,
	value,
	foldable,
}: {
	label: string
	value?: string | null
	foldable?: boolean
}) {
	const fold = foldable ? 'hidden group-hover:block group-focus-visible:block' : ''
	return (
		<>
			<dt className={`opacity-70 ${fold}`}>{label}</dt>
			<dd className={fold}>{value ?? ''}</dd>
		</>
	)
}
