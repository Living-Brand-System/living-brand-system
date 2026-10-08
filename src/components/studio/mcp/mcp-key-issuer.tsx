'use client'

import { Copy } from '@carbon/icons-react'
import { Controller } from '@/components/shared/controller'
import { PageCard } from '@/components/shared/page-card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { useMcpKeyIssuance } from '@/features/mcp-access/hooks/use-mcp-key-issuance'
import { cn } from '@/lib/utils'

/**
 * MCP 키를 발급하고 그 자리에서 클라이언트 등록 명령까지 건네는 카드.
 * 디자인 정본은 Figma HD_LBS_UI의 「MCP Usecase」(64:2) — 발급 전(64:999)·발급 중(64:1301)·
 * 발급 후(64:1150) 세 상태가 같은 카드 안에서 교대한다.
 *
 * 🔑 표면은 컨트롤러 킷이다. 디자인이 새 패널 언어를 그린 게 아니라 스튜디오 컨트롤러의
 *    Root/Row/Field를 그대로 재활용했으므로, 여기서 카드·행·필드 스타일을 다시 만들지 않는다.
 */
/** 발급일 표시 — 계정 카드의 가입일과 같은 형식. 🔴 존을 못 박는다(서버 TZ면 하루 밀린다). */
const ISSUED_AT_FORMAT = new Intl.DateTimeFormat('ko-KR', {
	dateStyle: 'long',
	timeZone: 'Asia/Seoul',
})

/**
 * @param issuedAt 이 계정의 현재 키 발급 시각(없으면 null). 키 값은 다시 보여 주지 않으므로, 이것으로
 *   「이미 키가 있다」와 「재발급하면 이전 키가 끊긴다」를 말한다 — 재발급은 교체다(계정당 키 하나).
 */
export function McpKeyIssuer({ issuedAt = null }: { issuedAt?: string | null }) {
	const { copyMessage, copyText, credential, error, issueKey, loading } = useMcpKeyIssuance()
	/*
	 * 🔑 Codex는 키를 **설정 파일에 헤더째** 넣는다 — Claude처럼 한 번 붙여 넣으면 끝난다.
	 *    `codex mcp add`에는 헤더 옵션이 없고 `--bearer-token-env-var`(환경변수 이름)뿐이라, 예전 명령은
	 *    `export`가 살아 있는 그 터미널에서만 연결됐다(새 창·Codex 앱·IDE에서는 끊김). config.toml의
	 *    `http_headers`는 CLI·앱·IDE가 함께 읽는다(openai/codex `McpServerTransportConfig::StreamableHttp`).
	 * 🔴 붙이기 전에 기존 표(하위 표 포함)를 awk로 걷는다 — 재발급 때 같은 표가 두 번 쌓이면 TOML이
	 *    깨져 **Codex가 아예 뜨지 않는다.** `codex mcp remove`에 맡기지 않는 이유: 데스크톱 앱만 쓰면
	 *    터미널에 codex가 없고, 실패가 조용해 중복이 그대로 쌓였다(2026-10-06 임시 HOME 실측).
	 *    키는 UUID라 TOML 문자열에 그대로 넣어도 안전하다.
	 */
	const codexCommand = credential
		? [
				'f=~/.codex/config.toml; mkdir -p ~/.codex; touch "$f"',
				`awk '/^\\[mcp_servers\\."?living-brand-system"?[].]/{s=1;next} /^\\[/{s=0} !s' "$f" > "$f.tmp" && mv "$f.tmp" "$f"`,
				`cat >> "$f" <<'EOF'`,
				'',
				'[mcp_servers.living-brand-system]',
				`url = "${credential.endpoint}"`,
				`http_headers = { Authorization = "Bearer ${credential.apiKey}" }`,
				'EOF',
			].join('\n')
		: ''
	const claudeCommand = credential
		? `claude mcp add --transport http living-brand-system --scope user '${credential.endpoint}' --header "Authorization: Bearer ${credential.apiKey}"`
		: ''

	return (
		// 카드는 세로로 자란다 — 패널용 lg:h-full을 되돌리지 않으면 발급 전에도 화면 높이를 다 먹는다.
		<PageCard.Root>
			<PageCard.Header title="MCP" description="외부 환경에서 사용할 키를 발급합니다." />

			{credential ? (
				<>
					<div className="flex flex-col gap-1">
						{/* 값만 읽는 행이라 readonly — docs/10 §3.6대로 정상 대비를 유지하고 흐리지 않는다. */}
						<Controller.Row readonly label="Key" className="pr-1">
							<span className="flex min-w-0 items-center gap-2">
								<span className="truncate text-muted-foreground text-sm">
									{credential.apiKey}
								</span>
								<Controller.Action
									aria-label="MCP 키 복사"
									onClick={() =>
										copyText(credential.apiKey, '키를 복사했습니다.')
									}
								>
									<Copy aria-hidden />
								</Controller.Action>
							</span>
						</Controller.Row>
						<div className="grid gap-2 sm:grid-cols-2">
							<Controller.Field
								label="Codex"
								action={
									<Controller.Action
										aria-label="Codex 등록 명령 복사"
										onClick={() =>
											copyText(
												codexCommand,
												'Codex 등록 명령을 복사했습니다.',
											)
										}
									>
										<Copy aria-hidden />
									</Controller.Action>
								}
							>
								{/*
								 * 🔴 field-sizing-fixed가 필요하다. base Textarea의 field-sizing-content는
								 *    내용 길이에 높이를 맞춰, 두 명령의 줄 수가 다르면 나란한 카드가 어긋난다.
								 */}
								<Controller.Textarea
									className="field-sizing-fixed"
									readOnly
									rows={4}
									value={codexCommand}
								/>
							</Controller.Field>
							<Controller.Field
								label="Claude"
								action={
									<Controller.Action
										aria-label="Claude Code 등록 명령 복사"
										onClick={() =>
											copyText(
												claudeCommand,
												'Claude Code 등록 명령을 복사했습니다.',
											)
										}
									>
										<Copy aria-hidden />
									</Controller.Action>
								}
							>
								<Controller.Textarea
									className="field-sizing-fixed"
									readOnly
									rows={4}
									value={claudeCommand}
								/>
							</Controller.Field>
						</div>
					</div>
					<Typography className="text-center" size="sm" tone="muted">
						이 키는 지금만 표시됩니다.
					</Typography>
				</>
			) : (
				<>
					{issuedAt && (
						<Controller.Row readonly label="발급됨">
							<span className="text-muted-foreground text-sm">
								{ISSUED_AT_FORMAT.format(new Date(issuedAt))}
							</span>
						</Controller.Row>
					)}
					{/*
					 * 발급 중에는 highlight의 흐르는 그라디언트가 진행을 말한다(디자인 64:1409).
					 * 🔴 그래서 disabled를 걸지 않는다 — highlight의 disabled는 그라디언트와 애니메이션을
					 *    모두 끄므로, 진행 표시가 통째로 사라진다. 중복 발급은 훅이 막는다.
					 */}
					<Button
						aria-busy={loading || undefined}
						aria-disabled={loading || undefined}
						className={cn('h-11 w-full rounded-lg', !loading && 'text-foreground')}
						onClick={issueKey}
						type="button"
						variant={loading ? 'highlight' : 'muted'}
					>
						{loading ? (
							<>
								<Spinner aria-hidden />
								<span className="sr-only">발급 중…</span>
							</>
						) : issuedAt ? (
							'MCP 키 재발급'
						) : (
							'MCP 키 발급'
						)}
					</Button>
					{issuedAt && (
						<Typography className="text-center" size="sm" tone="muted">
							재발급하면 이전 키는 바로 사용할 수 없습니다.
						</Typography>
					)}
				</>
			)}

			{error && (
				<Typography role="alert" size="sm" tone="destructive">
					{error}
				</Typography>
			)}
			{/* 복사는 화면이 바뀌지 않는 조작이라, 결과를 말해 주는 곳이 여기뿐이다(디자인에는 없는 층). */}
			<Typography aria-live="polite" className="sr-only" size="sm">
				{copyMessage}
			</Typography>
		</PageCard.Root>
	)
}
