'use client'

import { Launch } from '@carbon/icons-react'
import { Typography } from '@/components/ui/typography'

/** 바깥 페이지(새 탭)로 가는 링크, 또는 화면 안 모달을 여는 동작(파운데이션 모달의 한 탭). */
export type ManagerLink = { label: string } & ({ href: string } | { onOpen: () => void })

const LINK_CLASS =
	'inline-flex items-center gap-1 text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/30'

/**
 * 파운데이션(여러 템플릿이 같이 쓰는 데이터 — 브랜드 컬러·프로파일·샘플 이미지 등)의 관리 폼 — 여기서 고치지 않고
 * 그것을 관리하는 페이지로 보낸다(사용자 2026-10-13 「이런 파운데이션은 별도 페이지에서 관리. 편집하려면 링크」).
 */
export function ManagerLinkForm({ note, links }: { note: string; links: readonly ManagerLink[] }) {
	return (
		<div className="flex flex-col gap-2">
			<Typography size="xs" tone="muted">
				{note}
			</Typography>
			<ul className="flex flex-col gap-1">
				{links.map((link) => (
					<li key={link.label}>
						{'onOpen' in link ? (
							<button type="button" onClick={link.onOpen} className={LINK_CLASS}>
								{link.label}
							</button>
						) : (
							<a
								href={link.href}
								target="_blank"
								rel="noreferrer"
								className={LINK_CLASS}
							>
								{link.label}
								<Launch aria-hidden className="size-3.5" />
							</a>
						)}
					</li>
				))}
			</ul>
		</div>
	)
}
