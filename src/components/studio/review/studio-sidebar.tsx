'use client'

import type * as React from 'react'
import { Controller } from '@/components/shared/controller'
import { cn } from '@/lib/utils'

type StudioSidebarProps = {
	/** 스크롤되지 않는 Studio 아이덴티티·브라우저 트리거 영역. */
	header?: React.ReactNode
	/** 스크롤 영역 아래 고정되는 설정·실행 영역. */
	footer?: React.ReactNode
	className?: string
	children: React.ReactNode
}

/** Studio 사이드바의 공통 패널 껍데기 — 본문은 스크롤되고 footer는 하단에 고정된다. */
export function StudioSidebar({ header, footer, className, children }: StudioSidebarProps) {
	return (
		// 폭은 셸 열(auto)이 아니라 패널이 소유한다 — 22rem 열 − aside 패딩 32px = 320px 그대로.
		<Controller.Root data-slot="studio-sidebar" className={cn('lg:w-80', className)}>
			{header && <Controller.Header>{header}</Controller.Header>}
			<Controller.Content>{children}</Controller.Content>
			{footer && <Controller.Footer>{footer}</Controller.Footer>}
		</Controller.Root>
	)
}
