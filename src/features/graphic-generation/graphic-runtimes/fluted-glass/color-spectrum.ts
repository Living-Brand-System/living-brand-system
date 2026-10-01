import { formatHex, hsl } from 'culori'
import { isValidHex } from '@/lib/color'
import { FLUTED_GLASS_PALETTES } from './definition'

const reference = FLUTED_GLASS_PALETTES.green.colors
const anchor = parseHex(reference.rayColor3)

function parseHex(hex: string) {
	const color = hsl(`#${hex.replace(/^#/, '')}`)
	if (!isValidHex(hex) || !color) throw new Error(`Invalid hex color: ${hex}`)
	return color
}

/**
 * 두 색 입력을 광선 5색·배경·블룸으로 펼친다. UI와 셰이더 사이의 색 변환 경계.
 * 전경의 색조·채도를 정본에 옮기되 명도 계단은 보존한다(전경 명도는 사용하지 않는다).
 * 배경은 광선 보간에 섞지 않는다. 무채색 전경은 같은 명도 계단의 무채색 광선이 된다.
 */
export function flutedGlassColors(foreground: string, background: string) {
	const front = parseHex(foreground)
	const back = parseHex(background)
	const hueOffset = (front.h ?? anchor.h ?? 0) - (anchor.h ?? 0)
	const recolor = (hex: string) => {
		const color = parseHex(hex)
		return formatHex({
			...color,
			h: ((((color.h ?? 0) + hueOffset) % 360) + 360) % 360,
			s: color.s * front.s,
		})
	}
	return {
		rayColor1: recolor(reference.rayColor1),
		rayColor2: recolor(reference.rayColor2),
		rayColor3: recolor(reference.rayColor3),
		rayColor4: recolor(reference.rayColor4),
		rayColor5: recolor(reference.rayColor5),
		rayBackgroundColor: formatHex(back),
		bloomColor: recolor(reference.bloomColor),
	}
}
