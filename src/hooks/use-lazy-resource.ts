'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

export type LazyResourceStatus = 'idle' | 'loading' | 'ready' | 'error'

export type LazyResource<T> = {
	/** 아직 가져오지 않았거나 실패했으면 null이다 — status와 함께 읽는다. */
	data: T | null
	status: LazyResourceStatus
	/** 여러 번 불러도 한 번만 가져온다. 실패 뒤에는 다시 시도할 수 있다. */
	load: () => void
	/** 가져온 뒤 서버 쪽이 바뀌었을 때 같은 자원을 다시 가져온다(`load`는 한 번만 동작한다). */
	reload: () => void
}

/**
 * 처음 요청될 때 한 번만 가져오는 읽기 자원.
 * 자산 브라우저처럼 "열릴 때 목록을 불러오는" 자리에 쓴다 — 페이지 진입 비용에 목록을 싣지 않는다.
 * fetcher는 렌더마다 새로 만들지 않는다(모듈 최상위 client service를 그대로 넘긴다).
 */
export function useLazyResource<T>(fetcher: () => Promise<T>): LazyResource<T> {
	const [state, setState] = useState<{ data: T | null; status: LazyResourceStatus }>({
		data: null,
		status: 'idle',
	})
	// StrictMode의 이중 호출과 패널을 여닫는 반복 호출을 함께 막는다 — state로 막으면 둘 다 새는 창이 있다.
	const startedRef = useRef(false)

	const fetchInto = useCallback(() => {
		startedRef.current = true
		setState({ data: null, status: 'loading' })
		fetcher().then(
			(data) => setState({ data, status: 'ready' }),
			() => {
				startedRef.current = false
				setState({ data: null, status: 'error' })
			},
		)
	}, [fetcher])

	const load = useCallback(() => {
		if (startedRef.current) return
		fetchInto()
	}, [fetchInto])

	// 목록을 가져온 뒤 그 목록이 가리키는 문서를 바꿨을 때 쓴다(미리보기 갱신이 첫 소비자).
	// 🔴 `load`의 1회 가드를 우회하므로 "무엇이 바뀌었는지 아는 자리"에서만 부른다.
	const reload = useCallback(() => {
		if (!startedRef.current) return
		fetchInto()
	}, [fetchInto])

	// 컨텍스트 값에 그대로 실리는 객체다 — 렌더마다 새로 만들면 소비자의 메모가 전부 무효가 된다.
	return useMemo(() => ({ ...state, load, reload }), [load, reload, state])
}
