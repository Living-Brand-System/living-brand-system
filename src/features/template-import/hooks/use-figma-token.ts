'use client'

import { useState } from 'react'
import { loginHref, routes } from '@/lib/routes'

/**
 * 계정 화면의 Figma 토큰 등록·삭제 상태. 서버가 준 연결 여부에서 시작하고, 원문 토큰은 입력칸에만 산다
 * (등록 뒤 비운다 — 저장된 값을 다시 보여 주는 경로는 없다).
 */
export function useFigmaToken(initialConnected: boolean) {
	const [connected, setConnected] = useState(initialConnected)
	const [token, setToken] = useState('')
	const [pending, setPending] = useState(false)
	const [error, setError] = useState('')

	async function send(method: 'PUT' | 'DELETE', failMessage: string) {
		if (pending) return
		setError('')
		setPending(true)
		const response = await fetch('/api/figma-token', {
			method,
			headers: method === 'PUT' ? { 'Content-Type': 'application/json' } : undefined,
			body: method === 'PUT' ? JSON.stringify({ token }) : undefined,
		}).catch(() => null)
		setPending(false)

		if (response?.status === 401) {
			window.location.assign(loginHref(routes.account))
			return
		}
		if (!response?.ok) {
			const body = await response?.json().catch(() => null)
			setError(body?.message || failMessage)
			return
		}
		setConnected(method === 'PUT')
		setToken('')
	}

	return {
		connected,
		error,
		pending,
		register: () => send('PUT', 'Figma 토큰을 등록하지 못했습니다.'),
		remove: () => send('DELETE', 'Figma 토큰을 삭제하지 못했습니다.'),
		setToken,
		token,
	}
}
