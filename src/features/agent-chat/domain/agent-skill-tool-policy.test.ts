import { describe, expect, it } from 'vitest'
import type { getAgentTools } from '@/features/agent-chat/agent-chat-tools.agent'
import {
	type AgentTaskToolName,
	agentSkillSelectionSchema,
	agentToolTable,
	getAgentExecutionPolicy,
	readSkillName,
} from './agent-skill-tool-policy'

describe('agent skill tool policy', () => {
	it('등록된 skill에는 해당 skill의 도구 전체를 허용한다', () => {
		expect(getAgentExecutionPolicy({ name: 'generate-image' })).toEqual({
			activeTools: ['generateImage', 'listImageProfiles'],
			modelId: 'claude-sonnet-5',
		})
		expect(getAgentExecutionPolicy({ name: 'answer-guideline' }).activeTools).toEqual([
			'listGuidelineDocuments',
			'readGuidelineDocument',
			'searchGuidelines',
			'getCheckCatalog',
		])
	})

	it('테이블 키는 등록된 task tool(loadSkill 제외) 전체와 일치한다', () => {
		type RegisteredTaskToolName = Exclude<keyof ReturnType<typeof getAgentTools>, 'loadSkill'>
		type Covers<A, B> = [A] extends [B] ? true : false
		// 타입만으로 검증 — 키가 어긋나면 아래 대입이 컴파일 에러가 된다.
		const tableCoversRegistered: Covers<RegisteredTaskToolName, AgentTaskToolName> = true
		const registeredCoversTable: Covers<AgentTaskToolName, RegisteredTaskToolName> = true
		expect(tableCoversRegistered && registeredCoversTable).toBe(true)
		// 모든 행이 마커 문구 빌더를 가진다 — 새 tool이 문구 없이 추가될 수 없다.
		for (const row of Object.values(agentToolTable)) {
			expect(typeof row.resultText).toBe('function')
		}
	})

	it('등록되지 않은 skill에는 도구를 허용하지 않는다', () => {
		expect(getAgentExecutionPolicy({ name: 'unknown-skill' })).toEqual({
			activeTools: [],
			modelId: 'claude-sonnet-5',
		})
	})
})

describe('agentSkillSelectionSchema', () => {
	it('skill 이름만 허용하고 추가 필드는 거부한다', () => {
		expect(agentSkillSelectionSchema.parse({ name: ' generate-image ' })).toEqual({
			name: 'generate-image',
		})
		expect(agentSkillSelectionSchema.safeParse({ name: '' }).success).toBe(false)
		expect(
			agentSkillSelectionSchema.safeParse({ name: 'generate-image', extra: true }).success,
		).toBe(false)
	})
})

describe('readSkillName', () => {
	it('문자열 name이 있는 객체에서만 이름을 읽는다', () => {
		expect(readSkillName({ name: 'generate-image', description: '설명' })).toBe(
			'generate-image',
		)
		expect(readSkillName({ name: 7 })).toBeNull()
		expect(readSkillName({})).toBeNull()
		expect(readSkillName(null)).toBeNull()
		expect(readSkillName('generate-image')).toBeNull()
	})
})
