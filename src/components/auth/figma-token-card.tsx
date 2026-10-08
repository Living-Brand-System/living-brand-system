'use client'

import { Information } from '@carbon/icons-react'
import { Controller } from '@/components/shared/controller'
import { PageCard } from '@/components/shared/page-card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Typography } from '@/components/ui/typography'
import { useFigmaToken } from '@/features/template-import/hooks/use-figma-token'

/**
 * 내 Figma 개인 API 토큰 — 템플릿 가져오기가 이 토큰으로 내 권한 안의 파일을 읽는다.
 * 🔑 MCP 카드와 같은 컨트롤러 킷 표면이다. 「연결됨」은 토큰이 저장돼 있다는 뜻이고,
 *    만료·권한 문제는 가져오기 때 Figma가 알려 준다.
 */
export function FigmaTokenCard({ connected: initialConnected }: { connected: boolean }) {
	const { connected, error, pending, register, remove, setToken, token } =
		useFigmaToken(initialConnected)

	return (
		<PageCard.Root>
			<PageCard.Header
				title="Figma"
				adornment={
					// 발급 방법은 한 번만 필요한 도움말이라 본문이 아니라 툴팁에 둔다(content-heading과 같은 표면).
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								aria-label="Figma 토큰 발급 방법"
								shape="pill"
								size="icon-sm"
								type="button"
								variant="muted"
							>
								<Information aria-hidden className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent align="start" side="right" sideOffset={8}>
							Figma 설정 → Security → Personal access tokens에서 새 토큰을 만드세요.
							권한은 파일 내용 읽기(file_content:read)만 있으면 됩니다. 등록한 토큰은
							암호화해 저장하고 다시 표시하지 않습니다.
						</TooltipContent>
					</Tooltip>
				}
				description="템플릿 가져오기에 사용할 토큰을 등록합니다."
			/>

			<Controller.Row readonly label="상태">
				<span className="text-sm">{connected ? '연결됨' : '연결 안 됨'}</span>
			</Controller.Row>

			<form
				className="flex flex-col gap-2"
				onSubmit={(event) => {
					event.preventDefault()
					register()
				}}
			>
				<Controller.Row label={connected ? '새 토큰' : '토큰'}>
					<Controller.Input
						autoComplete="off"
						onChange={(event) => setToken(event.target.value)}
						placeholder="figd_…"
						type="password"
						value={token}
					/>
				</Controller.Row>
				<div className="grid gap-2 sm:grid-cols-2">
					<Button
						className="h-11 rounded-lg"
						disabled={pending || token.trim() === ''}
						type="submit"
						variant="muted"
					>
						{connected ? '토큰 교체' : '토큰 등록'}
					</Button>
					<Button
						className="h-11 rounded-lg"
						disabled={pending || !connected}
						onClick={remove}
						type="button"
						variant="muted"
					>
						토큰 삭제
					</Button>
				</div>
			</form>

			{error && (
				<Typography role="alert" size="sm" tone="destructive">
					{error}
				</Typography>
			)}
		</PageCard.Root>
	)
}
