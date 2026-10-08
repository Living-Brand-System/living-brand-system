import type * as React from 'react'
import { ControllerRoot } from '@/components/shared/controller'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/**
 * 설정형 페이지 카드 — 계정·로그인·토큰 한도·MCP 키·AI 사용량처럼 한 화면에 한두 장 서는 카드의 틀.
 * 컨트롤러 표면(`ControllerRoot` — 24px 모서리·그림자) 위에 제목 머리와 본문 간격만 얹는다.
 * 여러 화면 표면(auth·studio)이 함께 써서 `components/shared`에 있다. 본문은 각 화면이 채운다.
 */
function Root({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<ControllerRoot
			data-slot="page-card"
			className={cn('gap-3 px-3 pt-6 pb-3 lg:h-auto', className)}
			{...props}
		/>
	)
}

type HeaderProps = Omit<React.ComponentProps<'header'>, 'title'> & {
	title: React.ReactNode
	/** 페이지의 첫 카드는 `h1`, 같은 페이지의 나머지는 `h2`(기본) — 문서 구조가 정한다. */
	as?: 'h1' | 'h2'
	/** 같은 페이지의 보조 카드는 한 단계 작은 `xl`. */
	size?: '2xl' | 'xl'
	/** 제목 바로 옆에 붙는 것 — 역할 배지, 도움말 툴팁. */
	adornment?: React.ReactNode
	description?: React.ReactNode
	/** 머리 오른쪽 끝의 동작 하나 — 테마 토글, 모두 저장. */
	action?: React.ReactNode
}

function Header({
	title,
	as = 'h2',
	size = '2xl',
	adornment,
	description,
	action,
	className,
	...props
}: HeaderProps) {
	const heading = (
		<Typography as={as} size={size} weight="medium">
			{title}
		</Typography>
	)
	return (
		<header
			data-slot="page-card-header"
			className={cn('flex items-start justify-between gap-3 px-2', className)}
			{...props}
		>
			<div className="flex min-w-0 flex-col gap-1">
				{adornment ? (
					<div className="flex items-center gap-2">
						{heading}
						{adornment}
					</div>
				) : (
					heading
				)}
				{description && (
					<Typography size="sm" tone="muted">
						{description}
					</Typography>
				)}
			</div>
			{action}
		</header>
	)
}

export const PageCard = { Root, Header }
