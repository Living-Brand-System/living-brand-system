import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { McpKeyIssuer } from './mcp-key-issuer'

describe('McpKeyIssuer', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('발급한 키와 엔드포인트로 Codex와 Claude Code 등록 명령을 만든다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				json: async () => ({
					apiKey: 'test-key',
					endpoint: 'https://stage.example.com/api/mcp',
					id: 1,
				}),
				ok: true,
				status: 201,
			}),
		)

		render(<McpKeyIssuer />)
		fireEvent.click(screen.getByRole('button', { name: 'MCP 키 발급' }))

		// Codex는 환경변수가 아니라 config.toml에 헤더째 저장한다 — 새 터미널·앱·IDE에서도 연결된다.
		// 기존 표는 awk로 걷고 붙인다 — 재발급해도 표가 쌓이지 않는다(codex CLI 없이도).
		expect(await screen.findByRole('textbox', { name: 'Codex' })).toHaveValue(
			[
				'f=~/.codex/config.toml; mkdir -p ~/.codex; touch "$f"',
				`awk '/^\\[mcp_servers\\."?living-brand-system"?[].]/{s=1;next} /^\\[/{s=0} !s' "$f" > "$f.tmp" && mv "$f.tmp" "$f"`,
				`cat >> "$f" <<'EOF'`,
				'',
				'[mcp_servers.living-brand-system]',
				'url = "https://stage.example.com/api/mcp"',
				'http_headers = { Authorization = "Bearer test-key" }',
				'EOF',
			].join('\n'),
		)
		expect(screen.getByRole('textbox', { name: 'Claude' })).toHaveValue(
			'claude mcp add --transport http living-brand-system --scope user \'https://stage.example.com/api/mcp\' --header "Authorization: Bearer test-key"',
		)
	})
})
