'use client'

import type React from 'react'
import { createContext, useContext, useMemo } from 'react'

type StudioCapabilities = {
	/** 프로파일 문서를 쓸 수 있는가 — 미리보기 갱신처럼 계약 자체를 바꾸는 동작의 게이트. */
	canManageProfiles: boolean
}

const StudioCapabilitiesContext = createContext<StudioCapabilities>({ canManageProfiles: false })

/**
 * 스튜디오 화면이 "이 사용자가 무엇까지 할 수 있는가"를 읽는 자리.
 *
 * 🔑 스튜디오 layout 하나가 진입 페이지 6개를 전부 덮으므로 여기서 한 번만 심는다 — 페이지마다
 * 같은 boolean을 prop으로 흘리면 배선이 6벌이 된다. 값의 정본은 서버(`isManager`)이고 이 provider는
 * 그것을 화면까지 나르기만 한다. 🔴 표시 여부만 정할 뿐 강제는 라우트가 한다.
 */
export function StudioCapabilitiesProvider({
	canManageProfiles,
	children,
}: StudioCapabilities & { children: React.ReactNode }) {
	const value = useMemo(() => ({ canManageProfiles }), [canManageProfiles])
	return (
		<StudioCapabilitiesContext.Provider value={value}>
			{children}
		</StudioCapabilitiesContext.Provider>
	)
}

export function useStudioCapabilities() {
	return useContext(StudioCapabilitiesContext)
}
