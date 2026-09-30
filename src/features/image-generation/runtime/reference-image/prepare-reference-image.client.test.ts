import { afterEach, expect, it, vi } from 'vitest'
import { prepareReferenceImage } from './prepare-reference-image.client'

afterEach(() => vi.unstubAllGlobals())

it('취소하면 Worker를 종료하고 결과를 첨부하지 않는다', async () => {
	const terminate = vi.fn()
	vi.stubGlobal(
		'Worker',
		class {
			terminate = terminate
			postMessage = vi.fn()
		},
	)
	const controller = new AbortController()
	const result = prepareReferenceImage(new File(['image'], 'image.png'), controller.signal)
	controller.abort()
	await expect(result).rejects.toMatchObject({ name: 'AbortError' })
	expect(terminate).toHaveBeenCalledOnce()
})
