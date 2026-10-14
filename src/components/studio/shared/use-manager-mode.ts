'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * 켜짐과 고른 칸은 주소 하나가 갖는다 — `?manager`(켜짐) · `?manager=<칸 id>`(그 칸을 고름).
 * 새로고침하면 그대로, 다른 페이지로 가면 꺼진다(사용자 2026-10-13).
 */
const MANAGER_PARAM = 'manager'

/**
 * Manager mode(manager 이상) — 켜면 이 화면의 입력 칸을 눌러 그 칸의 앱 데이터(편집 권한 등)를 고친다.
 * 끄면 권한과 상관없이 모두 같은 화면이다. 보일지는 부르는 화면이, 막는 것은 Payload access가 정한다.
 */
export function useManagerMode() {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const on = searchParams.has(MANAGER_PARAM)
	const selected = searchParams.get(MANAGER_PARAM) || null

	const write = (value: string | null) => {
		const next = new URLSearchParams(searchParams)
		if (value === null) next.delete(MANAGER_PARAM)
		else next.set(MANAGER_PARAM, value)
		const query = next.toString()
		router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
	}

	return {
		on,
		selected,
		toggle: () => write(on ? null : ''),
		/** 같은 칸을 다시 누르면 선택을 푼다. */
		select: (itemId: string) => write(selected === itemId ? '' : itemId),
	}
}
