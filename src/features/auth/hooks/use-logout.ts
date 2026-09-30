'use client'

import { useState } from 'react'
import { routes } from '@/lib/routes'
import { requestLogout } from '../services/session.client'

const ERROR_MESSAGE = '로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.'

/** 로그아웃 상태. 성공하면 홈으로 전체 이동한다 — 세션이 바뀌었으므로 서버 렌더를 다시 받아야 한다. */
export function useLogout() {
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	async function logout() {
		if (loading) return
		setError('')
		setLoading(true)
		const ok = await requestLogout()

		if (ok) {
			window.location.assign(routes.home)
			return
		}
		setLoading(false)
		setError(ERROR_MESSAGE)
	}

	return { error, loading, logout }
}
