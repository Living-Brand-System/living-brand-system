'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** 켜짐은 주소가 갖는다 — 새로고침하면 그대로, 다른 페이지로 가면 꺼진다(사용자 2026-10-13). */
const MANAGER_PARAM = 'manager'

/**
 * Manager mode(manager 이상) — 켜면 이 화면에서 앱 데이터를 고친다. 끄면 권한과 상관없이 모두 같은 화면이다.
 * 보일지는 부르는 화면이, 막는 것은 Payload access가 정한다.
 */
export function useManagerMode() {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const on = searchParams.has(MANAGER_PARAM)

	const toggle = () => {
		const next = new URLSearchParams(searchParams)
		if (on) next.delete(MANAGER_PARAM)
		else next.set(MANAGER_PARAM, '')
		const query = next.toString()
		router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
	}

	return { on, toggle }
}
