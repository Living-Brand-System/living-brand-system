import { afterEach, expect, it, vi } from 'vitest'
import { lockupSvg } from './export-svg'

afterEach(() => {
	document.body.innerHTML = ''
	vi.unstubAllGlobals()
})

it('화면 맞춤 배율과 관계없이 같은 로고 좌표를 내보낸다', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ upm: 1000, runs: [{ d: 'M0 0L100 0', advance: 100 }] }),
		}),
	)
	const fit = document.createElement('div')
	fit.setAttribute('data-display-fit-content', '')
	const root = document.createElement('div')
	root.style.backgroundColor = 'rgb(12, 34, 56)'
	root.innerHTML =
		'<div data-ink="text" style="font-size:20px;color:black">HD</div><div data-ink="bar"></div>'
	fit.append(root)
	document.body.append(fit)
	let scale = 1
	const box = (left: number, top: number, width: number, height: number) => () =>
		({
			left: left * scale,
			top: top * scale,
			width: width * scale,
			height: height * scale,
		}) as DOMRect
	root.getBoundingClientRect = box(10, 20, 200, 100)
	root.children[0].getBoundingClientRect = box(20, 30, 100, 20)
	root.children[1].getBoundingClientRect = box(130, 30, 4, 30)
	fit.style.setProperty('--display-scale', '1')
	const full = await lockupSvg(root)
	scale = 0.4
	fit.style.setProperty('--display-scale', '0.4')
	expect(await lockupSvg(root)).toBe(full)
	expect(full).toContain('viewBox="0 0 200 100"')
	expect(full).not.toContain('rgb(12, 34, 56)')
})
