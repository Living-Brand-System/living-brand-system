'use client'

import { useState } from 'react'
import { requestLogin } from '../services/session.client'

/** 🔴 실패 문구는 이유를 가르지 않는다 — 계정이 있는지 없는지를 화면이 말해 주면 안 된다(docs/07). */
const REJECTED_MESSAGE = '이메일 또는 비밀번호가 올바르지 않습니다.'
const ERROR_MESSAGE = '로그인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'

/**
 * 로그인 폼 상태. 성공하면 서버가 세션 쿠키를 내려 주므로 **전체 이동**으로 넘어간다 —
 * router.push는 이미 받아 둔 서버 렌더 결과를 재사용할 수 있어 로그인 직후 화면이 비로그인
 * 상태로 남을 수 있다.
 */
export function useLoginForm(redirectTo: string) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const canSubmit = email.trim() !== '' && password !== '' && !loading

	async function submit() {
		if (!canSubmit) return
		setError('')
		setLoading(true)
		const result = await requestLogin(email.trim(), password)

		if (result.status === 'ok') {
			window.location.assign(redirectTo)
			return
		}
		setLoading(false)
		// 실패하면 비밀번호를 비운다(Carbon 로그인 패턴) — 다시 칠 때 지우는 수고를 없앤다.
		setPassword('')
		setError(result.status === 'rejected' ? REJECTED_MESSAGE : ERROR_MESSAGE)
	}

	return { canSubmit, email, error, loading, password, setEmail, setPassword, submit }
}
