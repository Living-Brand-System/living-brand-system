'use client'

import { useEffect, useSyncExternalStore } from 'react'

/**
 * 앱 셸(상단 헤더) 잠금. 중첩 편집처럼 화면 일부가 모달처럼 굴 때 트리 밖의 헤더까지 잠근다.
 * 헤더는 앱 셸에, 편집은 스튜디오 Provider 안에 있어 컨텍스트로 이어지지 않으므로 모듈 스토어로 잇는다.
 * 잠그는 쪽이 여럿이어도 마지막이 풀 때까지 잠겨 있도록 개수로 센다.
 */
let locks = 0
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

function setLocks(next: number) {
	locks = next
	for (const listener of listeners) listener()
}

/** 헤더가 읽는다 — 잠겨 있으면 `inert`를 건다. */
export function useShellLocked(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => locks > 0,
		() => false,
	)
}

/** 잠그는 쪽이 부른다 — `locked`인 동안, 그리고 마운트된 동안만 잠근다. */
export function useShellLock(locked: boolean) {
	useEffect(() => {
		if (!locked) return
		setLocks(locks + 1)
		return () => setLocks(locks - 1)
	}, [locked])
}
