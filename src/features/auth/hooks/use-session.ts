'use client'

import { useEffect, useState } from 'react'
import { requestSession } from '../services/session.client'

/**
 * 🔴 `unknown`이 따로 있는 이유: 첫 프레임에는 아직 모른다. 그때 「Log in」을 그리면 로그인한
 *    사람에게 로그아웃된 것처럼 깜빡이고, 「내 계정」을 그리면 그 반대가 된다. 모르는 동안은
 *    **아무 말도 하지 않는 것**이 맞다. `isAdmin`도 모르는 동안은 false다 — admin 전용 링크가
 *    다른 사람에게 잠깐 보였다 사라지는 것보다, admin에게 늦게 나타나는 편이 낫다.
 */
export type SessionState = { status: 'unknown' | 'out' | 'in'; isAdmin: boolean }

/** 헤더가 로그인 상태를 아는 유일한 통로. 마운트 때 한 번 묻고 끝난다. */
export function useSession(): SessionState {
	const [state, setState] = useState<SessionState>({ status: 'unknown', isAdmin: false })

	useEffect(() => {
		let active = true
		requestSession().then(({ signedIn, isAdmin }) => {
			if (!active) return
			setState({ status: signedIn ? 'in' : 'out', isAdmin })
		})
		// 언마운트 뒤 setState를 막는다 — 라우트 전환이 응답보다 빠를 수 있다.
		return () => {
			active = false
		}
	}, [])

	return state
}
