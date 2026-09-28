import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PasswordCard } from './password-card'

function fill(current: string, next: string, confirm: string) {
	fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: current } })
	fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: next } })
	fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: confirm } })
	fireEvent.click(screen.getByRole('button', { name: '비밀번호 바꾸기' }))
}

describe('PasswordCard', () => {
	afterEach(() => {
		cleanup()
		vi.unstubAllGlobals()
	})

	it('현재·새 비밀번호만 보낸다 — 확인란은 서버로 가지 않는다', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
		vi.stubGlobal('fetch', fetchMock)

		render(<PasswordCard />)
		fill('old-secret', 'brand-new-secret', 'brand-new-secret')

		await waitFor(() => expect(fetchMock).toHaveBeenCalled())
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/auth/password')
		expect(JSON.parse(init.body)).toEqual({
			currentPassword: 'old-secret',
			nextPassword: 'brand-new-secret',
		})
	})

	it('🔴 성공해도 실패해도 입력에 비밀번호를 남기지 않는다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))

		render(<PasswordCard />)
		fill('old-secret', 'brand-new-secret', 'brand-new-secret')

		await screen.findByRole('alert')
		expect(screen.getByLabelText('현재 비밀번호')).toHaveValue('')
		expect(screen.getByLabelText('새 비밀번호')).toHaveValue('')
	})

	it('서로 다른 확인란은 서버까지 가지 않는다 — 헛되이 로그인 시도를 쓰지 않는다', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)

		render(<PasswordCard />)
		fill('old-secret', 'brand-new-secret', 'different-secret')

		expect(await screen.findByRole('alert')).toHaveTextContent('새 비밀번호가 서로 다릅니다.')
		expect(fetchMock).not.toHaveBeenCalled()
	})
})
