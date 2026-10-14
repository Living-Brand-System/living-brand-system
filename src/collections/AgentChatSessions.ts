import type { CollectionConfig } from 'payload'
import { AGENT_CHAT_REACTION_OPTIONS } from '@/features/agent-chat/types'
import { managerOrAdmin } from '@/lib/auth'

export const AgentChatSessions: CollectionConfig = {
	slug: 'agent-chat-sessions',
	access: {
		read: managerOrAdmin,
		// 클라이언트가 운영 기록을 위조하지 못하도록 service repository만 생성한다.
		create: () => false,
		update: () => false,
		delete: managerOrAdmin,
	},
	labels: {
		singular: '에이전트 대화 기록',
		plural: '에이전트 대화 기록',
	},
	admin: {
		group: '운영 기록',
		useAsTitle: 'status',
		defaultColumns: ['status', 'pagePath', 'createdBy', 'createdAt'],
		description: 'Agent 채팅 실행 1회 단위의 세션 기록입니다.',
	},
	fields: [
		{
			name: 'status',
			type: 'select',
			required: true,
			defaultValue: 'running',
			admin: {
				position: 'sidebar',
			},
			options: [
				{ label: 'Running', value: 'running' },
				{ label: 'Completed', value: 'completed' },
				{ label: 'Failed', value: 'failed' },
			],
		},
		{
			name: 'pagePath',
			type: 'text',
			admin: {
				description: '채팅이 시작된 화면 경로입니다.',
				position: 'sidebar',
			},
		},
		{
			name: 'messageCount',
			type: 'number',
			admin: {
				description: '요청과 응답을 포함한 세션 메시지 수입니다.',
				position: 'sidebar',
				step: 1,
			},
		},
		{
			name: 'messagesTable',
			type: 'ui',
			admin: {
				components: {
					Field: '/components/admin/agent-chat-sessions/agent-chat-messages-table#AgentChatMessagesTable',
				},
			},
		},
		{
			name: 'messages',
			type: 'array',
			admin: {
				description: '세션에 포함된 대화 버블과 버블별 실행 메타데이터입니다.',
				hidden: true,
				initCollapsed: true,
			},
			fields: [
				{
					name: 'messageId',
					type: 'text',
					required: true,
				},
				{
					name: 'role',
					type: 'select',
					required: true,
					options: [
						{ label: 'System', value: 'system' },
						{ label: 'User', value: 'user' },
						{ label: 'Assistant', value: 'assistant' },
					],
				},
				{
					name: 'text',
					type: 'textarea',
				},
				{
					name: 'usedTools',
					type: 'array',
					admin: {
						description: '이 메시지를 생성하는 동안 호출된 tool입니다.',
						initCollapsed: true,
					},
					fields: [
						{
							name: 'name',
							type: 'text',
							required: true,
						},
						{
							name: 'callCount',
							type: 'number',
							admin: { step: 1 },
						},
					],
				},
				{
					name: 'usedSkills',
					type: 'array',
					admin: {
						description: '이 메시지를 생성하는 동안 선택된 skill입니다.',
						initCollapsed: true,
					},
					fields: [
						{
							name: 'name',
							type: 'text',
							required: true,
						},
						{
							name: 'callCount',
							type: 'number',
							admin: { step: 1 },
						},
					],
				},
				{
					name: 'aiUsage',
					type: 'group',
					admin: {
						description: '이 메시지를 생성한 모델과 토큰 사용량입니다.',
					},
					fields: [
						{
							name: 'model',
							type: 'text',
						},
						{
							name: 'callCount',
							type: 'number',
							admin: { step: 1 },
						},
						{
							name: 'inputTokens',
							type: 'number',
							admin: { step: 1 },
						},
						{
							name: 'outputTokens',
							type: 'number',
							admin: { step: 1 },
						},
						{
							name: 'totalTokens',
							type: 'number',
							admin: { step: 1 },
						},
						{
							name: 'cacheReadInputTokens',
							type: 'number',
							admin: { step: 1 },
						},
						{
							name: 'cacheWriteInputTokens',
							type: 'number',
							admin: { step: 1 },
						},
						{
							name: 'reasoningTokens',
							type: 'number',
							admin: { step: 1 },
						},
						{
							name: 'rawUsage',
							type: 'json',
						},
					],
				},
				{
					name: 'reaction',
					type: 'select',
					options: [...AGENT_CHAT_REACTION_OPTIONS],
					admin: {
						description: '이 Agent 답변 버블에 대한 사용자 피드백입니다.',
					},
				},
				{
					name: 'reactedAt',
					type: 'date',
				},
			],
		},
		{
			name: 'usedToolsTable',
			type: 'ui',
			admin: {
				components: {
					Field: '/components/admin/agent-chat-sessions/agent-chat-counted-items-table#AgentChatCountedItemsTable',
				},
			},
		},
		{
			name: 'usedTools',
			type: 'array',
			admin: {
				description: 'Agent가 호출한 tool 이름과 호출 횟수입니다.',
				hidden: true,
				initCollapsed: true,
			},
			fields: [
				{
					name: 'name',
					type: 'text',
					required: true,
				},
				{
					name: 'callCount',
					type: 'number',
					admin: { step: 1 },
				},
			],
		},
		{
			name: 'usedSkillsTable',
			type: 'ui',
			admin: {
				components: {
					Field: '/components/admin/agent-chat-sessions/agent-chat-counted-items-table#AgentChatCountedItemsTable',
				},
			},
		},
		{
			name: 'usedSkills',
			type: 'array',
			admin: {
				description: 'loadSkill로 선택된 Agent skill 이름과 호출 횟수입니다.',
				hidden: true,
				initCollapsed: true,
			},
			fields: [
				{
					name: 'name',
					type: 'text',
					required: true,
				},
				{
					name: 'callCount',
					type: 'number',
					admin: { step: 1 },
				},
			],
		},
		{
			name: 'aiUsageTable',
			type: 'ui',
			admin: {
				components: {
					Field: '/components/admin/agent-chat-sessions/agent-chat-usage-table#AgentChatUsageTable',
				},
			},
		},
		{
			name: 'errorMessage',
			type: 'textarea',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'completedAt',
			type: 'date',
			admin: {
				position: 'sidebar',
			},
		},
		{
			name: 'createdBy',
			type: 'relationship',
			relationTo: 'users',
			admin: {
				position: 'sidebar',
			},
		},
	],
	timestamps: true,
}
