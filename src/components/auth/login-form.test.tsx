import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from './login-form'

/** 폼을 채우고 제출한다 — 세 테스트가 같은 동작을 쓴다. */
function submitWith(email: string, password: string) {
	fireEvent.change(screen.getByLabelText('이메일'), { target: { value: email } })
	fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: password } })
	fireEvent.click(screen.getByRole('button', { name: '로그인' }))
}

describe('LoginForm', () => {
	afterEach(() => {
		// 이 리포의 vitest.setup은 자동 cleanup을 걸지 않는다 — 안 지우면 다음 render가 겹쳐 보인다.
		cleanup()
		vi.unstubAllGlobals()
	})

	it('자격 증명을 앱 로그인 라우트로 보낸다 — Payload 주소로 보내지 않는다', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
		vi.stubGlobal('fetch', fetchMock)
		// 성공하면 전체 이동한다. jsdom의 navigation 미구현 오류를 피하려고 갈아끼운다.
		vi.stubGlobal('location', { assign: vi.fn() })

		render(<LoginForm redirectTo="/account" />)
		submitWith('a@b.co', 'pw')

		await waitFor(() => expect(fetchMock).toHaveBeenCalled())
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/auth/login')
		expect(init.method).toBe('POST')
		expect(JSON.parse(init.body)).toEqual({ email: 'a@b.co', password: 'pw' })
	})

	it('🔴 실패 문구가 이유를 가르지 않는다 — 계정이 있는지를 화면이 말하면 안 된다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

		render(<LoginForm redirectTo="/account" />)
		submitWith('a@b.co', 'wrong')

		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent('이메일 또는 비밀번호가 올바르지 않습니다.')
		// 잠김·미등록 같은 단서가 새어 나가면 이메일 존재 여부를 알려 주는 것과 같다.
		expect(alert).not.toHaveTextContent(/잠|없는|등록/)
	})

	it('서버가 못 한 것과 자격 증명이 틀린 것을 다른 문구로 말한다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

		render(<LoginForm redirectTo="/account" />)
		submitWith('a@b.co', 'pw')

		// 장애 중에 「비밀번호가 틀렸다」고 하면 사용자가 다시 치다가 계정을 잠근다.
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'로그인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
		)
	})

	it('실패하면 비밀번호를 비운다', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

		render(<LoginForm redirectTo="/account" />)
		submitWith('a@b.co', 'wrong')

		await screen.findByRole('alert')
		expect(screen.getByLabelText('비밀번호')).toHaveValue('')
		expect(screen.getByLabelText('이메일')).toHaveValue('a@b.co')
	})
})
