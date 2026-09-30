import config from '@payload-config'
import { getPayload } from 'payload'
import type { PresetPanelDisplay as PresetPanelDisplayRow } from '@/payload-types'
import {
	type LogoRef,
	type LogoSources,
	resolveLogoSet,
} from '../../../../displays/dynamics/logo-set'
import {
	BAND_OPACITY,
	type ColorPreset,
	colorPreset,
	type PresetKey,
	TYPO_FONT_SIZE,
	TYPO_LINE_HEIGHT,
	TYPO_MAX_WIDTH,
	TYPO_SAMPLE_LINES,
	TYPO_WEIGHT,
	type TypoPreset,
	typoPreset,
} from '../../../../displays/dynamics/preset-panel/presets'

/** 로고가 패널 폭에서 차지하는 비율. SVG-54에서 154 / 456(가로형 기준). */
const LOGO_WIDTH = '33.8%'
/** 세로형 로고를 고르면 폭 기준만으로는 패널을 넘는다. 높이 상한을 둬서 그때는 높이가 기준이 된다. */
const LOGO_MAX_HEIGHT = '62%'

/**
 * 프리셋 패널(서버) — 카드 판을 **가득 채우는** 위반 예시. 판의 비율·둥근 모서리·clip은 카드가 소유하므로
 * 여기는 `absolute inset-0`으로 채우기만 한다. 컬러 프리셋만 로고를 얹으므로 그때만 brand-logos를 조회한다.
 * 표현은 SVG-54(COLOR 사용 금지)·Artboard 49(타이포)의 판을 따른다.
 */
export async function PresetPanel({ preset, logo }: { preset?: PresetKey | null; logo?: LogoRef }) {
	if (!preset) return null
	const color = colorPreset(preset)
	if (color) {
		const logos = await resolveLogoSet(await getPayload({ config }), logo)
		return <ColorPanel preset={color} logos={logos} />
	}
	const typo = typoPreset(preset)
	return typo ? <TypoPanel preset={typo} /> : null
}

/** 배경 패널 + (있으면) 겹치는 띠 + 가운데 로고. */
function ColorPanel({ preset, logos }: { preset: ColorPreset; logos: LogoSources | null }) {
	return (
		<div className="absolute inset-0" style={{ background: preset.panel }}>
			{preset.bands?.map((band) => (
				<div
					key={`${band.color}-${band.leftPct}`}
					className="absolute inset-y-0"
					style={{
						left: `${band.leftPct}%`,
						width: `${band.widthPct}%`,
						backgroundColor: band.color,
						opacity: BAND_OPACITY,
					}}
				/>
			))}
			<div className="absolute inset-0 grid place-items-center">
				<LogoMark logo={preset.logo} logos={logos} />
			</div>
		</div>
	)
}

/**
 * 타이포 위반 판 — 위반이 글자 자체라 중립면 위에 문구만 가운데 놓는다. 여섯 프리셋이 같은 문구·같은 크기라
 * 판마다 다른 것은 위반뿐이다.
 */
function TypoPanel({ preset }: { preset: TypoPreset }) {
	return (
		<div
			className="absolute inset-0 grid place-items-center overflow-hidden"
			// 글자를 판 기준으로 잰다 — 카드 폭이 바뀌어도 판 안의 그림이 같아진다.
			style={{ containerType: 'inline-size' }}
		>
			<p
				className="text-center text-foreground"
				style={{
					fontFamily: preset.fontFamily,
					// 🔴 자간이 em이라 크기를 반드시 여기(문단)에 준다. 크기가 줄에만 있으면 em이 상속된
					//    16px 기준으로 풀려 자간 위반이 거의 안 보인다.
					fontSize: TYPO_FONT_SIZE,
					fontWeight: TYPO_WEIGHT,
					letterSpacing: preset.letterSpacing,
					lineHeight: TYPO_LINE_HEIGHT,
					transform: preset.transform,
					// 넘치면 잘려서 무슨 위반인지 안 보인다. 잘리기 전에 줄바꿈으로 흘린다.
					maxWidth: TYPO_MAX_WIDTH,
				}}
			>
				{TYPO_SAMPLE_LINES.map((line, index) => (
					// 줄 크기는 문단 기준 배수다(기본 1em). 한 문장 안 크기 혼재가 이 배수로 표현된다.
					<span
						key={line}
						className="block"
						style={{ fontSize: `${preset.lineScale?.[index] ?? 1}em` }}
					>
						{line}
					</span>
				))}
			</p>
		</div>
	)
}

function LogoMark({ logo, logos }: { logo: ColorPreset['logo']; logos: LogoSources | null }) {
	if (!logos) return null

	if (logo.fill) {
		// 단색형은 fill 속성이 없는 실루엣이라 mask로 색을 입힌다 — 여기서는 그 색이 "지정 외 컬러"다.
		if (!logos.mono) return null
		return (
			<div
				role="img"
				aria-label={`지정되지 않은 색(${logo.fill})으로 칠한 로고`}
				style={{
					width: LOGO_WIDTH,
					height: LOGO_MAX_HEIGHT,
					backgroundColor: logo.fill,
					opacity: logo.opacity,
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

	const src = logo.variant === 'white' ? logos.white : logos.default
	if (!src) return null
	return (
		// biome-ignore lint/performance/noImgElement: Payload upload URL이라 next/image 미사용.
		<img
			src={src}
			alt=""
			draggable={false}
			// preflight의 `img{max-width:100%}`가 폭 지정을 셀 폭으로 되돌리므로 max-w-none이 필요하다.
			className="h-auto max-w-none object-contain"
			style={{ width: LOGO_WIDTH, maxHeight: LOGO_MAX_HEIGHT, opacity: logo.opacity }}
		/>
	)
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function PresetPanelDisplay({ display }: { display: PresetPanelDisplayRow }) {
	return <PresetPanel preset={display.preset} logo={display.logo} />
}
