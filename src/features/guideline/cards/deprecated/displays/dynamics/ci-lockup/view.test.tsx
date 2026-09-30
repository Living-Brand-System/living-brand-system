import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CiLockupView } from './view'

const { morph } = vi.hoisted(() => ({ morph: vi.fn() }))
vi.mock('../../../../displays/dynamics/ci-lockup/motion', async (original) => ({
	...(await original<typeof import('../../../../displays/dynamics/ci-lockup/motion')>()),
	morph,
	reducedMotion: () => false,
}))
vi.mock('@/features/guideline/cards/actions', () => ({ DisplayDownload: () => null }))
afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	morph.mockClear()
})

it('first hover and resizing do not animate, while a real symbol move still does', () => {
	let width = 300
	let symbolX = 20
	const resize: (() => void)[] = []
	vi.stubGlobal(
		'ResizeObserver',
		class {
			constructor(callback: () => void) {
				resize.push(callback)
			}
			observe() {}
			disconnect() {}
		},
	)
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(600)
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200)
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
	vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600)
	vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(0)
	vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (
		this: HTMLElement,
	) {
		const parent = this.closest('[data-display-fit-content]') as HTMLElement | null
		// Before transform, a static fit wrapper does not establish the coordinate origin.
		return parent && !parent.classList.contains('relative') && !parent.style.transform ? 200 : 0
	})
	vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: Element,
	) {
		const content = this.closest('[data-display-fit-content]') as HTMLElement | null
		const scale = Number(content?.style.getPropertyValue('--display-scale') || 1)
		const symbol = this.hasAttribute('data-ink') && this.getAttribute('data-ink') === 'symbol'
		return {
			x: 100,
			y: 100,
			left: 100 + (symbol ? symbolX * scale : 0),
			top: 100,
			width: 600 * scale,
			height: 200 * scale,
			right: 700,
			bottom: 300,
			toJSON() {
				return {}
			},
		}
	})
	const { container } = render(<CiLockupView colors={{}} />)
	const stage = container.firstElementChild as HTMLElement
	fireEvent.pointerEnter(stage)
	expect(morph).not.toHaveBeenCalled()
	fireEvent.pointerLeave(stage)
	width = 150
	act(() => {
		for (const update of resize) update()
	})
	fireEvent.pointerEnter(stage)
	expect(morph).not.toHaveBeenCalled()
	symbolX = 40
	fireEvent.pointerLeave(stage)
	expect(morph).toHaveBeenCalledWith(expect.any(HTMLElement), {
		transform: 'translate(-20px, 0px)',
	})
})
