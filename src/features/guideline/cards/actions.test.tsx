import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { downloadBlob } from '@/lib/object-url'
import { CardActions, CardActionsProvider, DisplayDownload } from './actions'

vi.mock('@/lib/object-url', () => ({ downloadBlob: vi.fn() }))
afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

it('카드별 액션을 분리하고 실행 중에는 중복 다운로드를 막는다', async () => {
	let finish!: (file: { filename: string; blob: Blob }) => void
	const first = vi.fn(
		() =>
			new Promise<{ filename: string; blob: Blob }>((resolve) => {
				finish = resolve
			}),
	)
	const second = vi.fn()
	render(
		[
			{ id: 'first', download: first },
			{ id: 'second', download: second },
		].map(({ id, download }) => (
			<CardActionsProvider key={id} formats={['svg']}>
				<DisplayDownload format="svg" label={id} download={download} />
				<CardActions />
			</CardActionsProvider>
		)),
	)
	const button = await screen.findByRole('button', { name: 'first' })
	fireEvent.click(button)
	fireEvent.click(button)
	expect(button).toBeDisabled()
	expect(first).toHaveBeenCalledTimes(1)
	expect(second).not.toHaveBeenCalled()
	const file = { filename: 'logo.svg', blob: new Blob(['<svg/>']) }
	await act(async () => finish(file))
	expect(downloadBlob).toHaveBeenCalledWith(file.blob, file.filename)
	expect(button).not.toBeDisabled()
})

it('미지원 액션은 숨기고 실패한 다운로드는 재시도할 수 있다', async () => {
	const download = vi
		.fn()
		.mockRejectedValueOnce(new Error('failed'))
		.mockResolvedValue({ filename: 'retry.svg', blob: new Blob() })
	const { rerender } = render(
		<CardActionsProvider formats={[]}>
			<DisplayDownload format="svg" label="내려받기" download={download} />
			<CardActions />
		</CardActionsProvider>,
	)
	expect(screen.queryByRole('button')).toBeNull()
	rerender(
		<CardActionsProvider formats={['svg']}>
			<DisplayDownload format="svg" label="내려받기" download={download} />
			<CardActions />
		</CardActionsProvider>,
	)
	fireEvent.click(await screen.findByRole('button'))
	expect(await screen.findByRole('alert')).toHaveTextContent('다시 시도')
	fireEvent.click(screen.getByRole('button'))
	await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1))
	expect(screen.queryByRole('alert')).toBeNull()
})
