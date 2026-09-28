'use client'

import { useState } from 'react'
import { requestPasswordChange } from '../services/session.client'

const MISMATCH_MESSAGE = '새 비밀번호가 서로 다릅니다.'
const DONE_MESSAGE = '비밀번호를 바꿨습니다.'

/** 새 비밀번호 최소 길이 — docs/07 「비밀번호 정책」. 서버도 같은 값으로 다시 검사한다. */
export const PASSWORD_MIN_LENGTH = 12

/** 비밀번호 변경 화면 상태. 🔴 값은 성공하든 실패하든 화면에 남기지 않는다. */
export function usePasswordChange() {
	const [currentPassword, setCurrentPassword] = useState('')
	const [nextPassword, setNextPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [done, setDone] = useState('')
	const [loading, setLoading] = useState(false)

	const canSubmit =
		currentPassword !== '' &&
		nextPassword.length >= PASSWORD_MIN_LENGTH &&
		confirmPassword !== '' &&
		!loading

	function clear() {
		setCurrentPassword('')
		setNextPassword('')
		setConfirmPassword('')
	}

	async function submit() {
		if (!canSubmit) return
		setError('')
		setDone('')
		// 서버까지 가지 않아도 아는 것은 여기서 거른다 — 헛되이 로그인 시도 횟수를 쓰지 않는다.
		if (nextPassword !== confirmPassword) {
			setError(MISMATCH_MESSAGE)
			return
		}

		setLoading(true)
		const result = await requestPasswordChange(currentPassword, nextPassword)
		setLoading(false)

		if (result.status === 'ok') {
			clear()
			setDone(DONE_MESSAGE)
			return
		}
		// 실패해도 입력은 지운다 — 화면에 비밀번호가 남아 있을 이유가 없다.
		clear()
		setError(result.message)
	}

	return {
		canSubmit,
		confirmPassword,
		currentPassword,
		done,
		error,
		loading,
		nextPassword,
		setConfirmPassword,
		setCurrentPassword,
		setNextPassword,
		submit,
	}
}
