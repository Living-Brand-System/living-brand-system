import { hsl } from 'culori'
import { expect, it } from 'vitest'
import { flutedGlassColors } from './color-spectrum'
import { FLUTED_GLASS_PALETTES } from './definition'

it('정본의 중간색을 입력하면 기존 그린 스펙트럼을 그대로 복원한다', () => {
	const reference = FLUTED_GLASS_PALETTES.green.colors
	expect(flutedGlassColors(reference.rayColor3, reference.rayBackgroundColor)).toEqual(reference)
})

it('색조를 바꾸어도 명도 계단을 보존하고 배경을 광선·블룸에 섞지 않는다', () => {
	const dark = flutedGlassColors('#003087', '#000000')
	const light = flutedGlassColors('#003087', '#ffffff')
	expect(light).toEqual({ ...dark, rayBackgroundColor: '#ffffff' })
	for (const key of [
		'rayColor1',
		'rayColor2',
		'rayColor3',
		'rayColor4',
		'rayColor5',
		'bloomColor',
	] as const) {
		expect(hsl(dark[key])?.l).toBeCloseTo(
			hsl(FLUTED_GLASS_PALETTES.green.colors[key])?.l ?? NaN,
			2,
		)
		expect(hsl(dark[key])?.h).toBeGreaterThan(200)
		expect(hsl(dark[key])?.h).toBeLessThan(240)
	}
	// 전경 명도를 올려도 암부와 하이라이트를 평평하게 만들지 않는다.
	expect(flutedGlassColors('#0050e1', '#000000')).toEqual(dark)
})

it('무채색도 유효한 스펙트럼을 만들고 잘못된 색 입력은 거부한다', () => {
	for (const foreground of ['#000000', '#808080', '#ffffff']) {
		expect(flutedGlassColors(foreground, 'ABCDEF')).toEqual({
			rayColor1: '#070707',
			rayColor2: '#212121',
			rayColor3: '#434343',
			rayColor4: '#858585',
			rayColor5: '#f0f0f0',
			rayBackgroundColor: '#abcdef',
			bloomColor: '#9e9e9e',
		})
	}
	for (const invalid of ['red', '#abc', '#11223344', '#gg0000', '']) {
		expect(() => flutedGlassColors(invalid, '#ffffff')).toThrow('Invalid hex color')
		expect(() => flutedGlassColors('#000000', invalid)).toThrow('Invalid hex color')
	}
})
