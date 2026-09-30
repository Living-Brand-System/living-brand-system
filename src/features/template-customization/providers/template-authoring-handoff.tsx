'use client'

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import type { TemplateSessionPatch } from '@/features/template-customization/domain/template-session-patch'

/**
 * 챗이 만든 편집안을 템플릿 스튜디오로 넘기는 통로.
 *
 * 🔴 **왜 컨텍스트가 필요한가.** 챗(`GlobalAgentChat`)은 루트 레이아웃에서 `{children}`의 **형제**다 —
 *    스튜디오의 `TemplateStudioProvider` 안이 아니라서 세션을 직접 만질 수 없다. 그래서 둘의 공통
 *    조상(레이아웃)에 이 통로를 두고, 챗은 밀고 스튜디오는 자기 것일 때만 집어 간다.
 * 🔑 레이아웃은 클라이언트 내비게이션에서 언마운트되지 않으므로, 챗이 다른 페이지에서 만든 편집안도
 *    스튜디오로 이동한 뒤 그대로 적용된다. **DB·URL·스토리지가 필요 없다.**
 * 🔴 편집안을 URL에 싣지 않는다 — 내용이 주소에 남고 길이 제한도 걸린다.
 *
 * ponytail: 대기열이 아니라 **한 자리**다. 새 편집안이 오면 아직 안 집어 간 것을 덮는다 — 사용자가
 *   연달아 요청하면 마지막 것이 맞는 답이다. 여러 개를 쌓아야 할 이유가 생기면 그때 배열로 바꾼다.
 */
export type TemplateAuthoringRequest = {
	/** 어느 템플릿용인가 — 다른 템플릿의 스튜디오가 집어 쓰지 않게 하는 자물쇠다. */
	templateId: number
	patch: TemplateSessionPatch
	/** 같은 편집안이 두 번 얹히지 않게 하는 식별자. */
	id: string
}

type TemplateAuthoringHandoff = {
	pending: TemplateAuthoringRequest | null
	/** 챗이 부른다. */
	send: (request: Omit<TemplateAuthoringRequest, 'id'>) => void
	/** 스튜디오가 얹은 뒤 부른다. 🔑 id를 확인해 그 사이 도착한 새 편집안을 지우지 않는다. */
	clear: (id: string) => void
}

const TemplateAuthoringHandoffContext = createContext<TemplateAuthoringHandoff | null>(null)

export function TemplateAuthoringHandoffProvider({ children }: { children: ReactNode }) {
	const [pending, setPending] = useState<TemplateAuthoringRequest | null>(null)
	const send = useCallback((request: Omit<TemplateAuthoringRequest, 'id'>) => {
		setPending({ ...request, id: crypto.randomUUID() })
	}, [])
	const clear = useCallback((id: string) => {
		setPending((current) => (current?.id === id ? null : current))
	}, [])
	const value = useMemo(() => ({ pending, send, clear }), [clear, pending, send])
	return (
		<TemplateAuthoringHandoffContext.Provider value={value}>
			{children}
		</TemplateAuthoringHandoffContext.Provider>
	)
}

/**
 * 🔑 provider 없이도 부를 수 있다 — 챗은 모든 화면에 있고 스튜디오는 일부 화면에만 있어서,
 *    없을 때 던지면 통로를 안 쓰는 화면이 죽는다. 없으면 「보낼 곳이 없다」로 조용히 동작한다.
 */
export function useTemplateAuthoringHandoff(): TemplateAuthoringHandoff {
	return useContext(TemplateAuthoringHandoffContext) ?? FALLBACK
}

const FALLBACK: TemplateAuthoringHandoff = {
	pending: null,
	send: () => {},
	clear: () => {},
}
