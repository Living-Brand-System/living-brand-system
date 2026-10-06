import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { McpKeyIssuer } from './mcp-key-issuer'

describe('McpKeyIssuer', () => {
	afterEach(() => {
		// 렌더한 카드를 테스트마다 걷는다 — 남으면 다음 테스트가 앞 카드의 문구를 찾는다.
		cleanup()
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

		expect(await screen.findByRole('textbox', { name: 'Codex' })).toHaveValue(
			"export LBS_MCP_API_KEY='test-key'\n" +
				"codex mcp add living-brand-system --url 'https://stage.example.com/api/mcp' --bearer-token-env-var LBS_MCP_API_KEY",
		)
		expect(screen.getByRole('textbox', { name: 'Claude' })).toHaveValue(
			'claude mcp add --transport http living-brand-system --scope user \'https://stage.example.com/api/mcp\' --header "Authorization: Bearer test-key"',
		)
	})

	it('이미 키가 있으면 발급일과 함께 재발급으로 묻고, 이전 키가 끊긴다고 알린다', () => {
		render(<McpKeyIssuer issuedAt="2026-10-02T01:00:00.000Z" />)

		expect(screen.getByText('2026년 10월 2일')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'MCP 키 재발급' })).toBeInTheDocument()
		expect(
			screen.getByText('재발급하면 이전 키는 바로 사용할 수 없습니다.'),
		).toBeInTheDocument()
	})

	it('키가 없으면 첫 발급으로 묻고 경고를 띄우지 않는다', () => {
		render(<McpKeyIssuer />)

		expect(screen.getByRole('button', { name: 'MCP 키 발급' })).toBeInTheDocument()
		expect(screen.queryByText('재발급하면 이전 키는 바로 사용할 수 없습니다.')).toBeNull()
	})
})
