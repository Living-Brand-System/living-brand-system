import type { ReactNode } from 'react'

/** 어드민 본문 섹션 헤딩 — 정본(83:1551) 26px Medium. 색은 HD deep green(chart-4, 다크에서는 light green). */
export function AdminSectionHeading({ children }: { children: ReactNode }) {
	return <h2 className="mb-6 font-medium text-2xl text-chart-4">{children}</h2>
}
