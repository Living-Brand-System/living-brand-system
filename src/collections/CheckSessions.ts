import type { CollectionConfig } from 'payload'
import {
	CHECK_IMAGE_MEDIA_TYPE_OPTIONS,
	CHECK_SESSION_SOURCE_OPTIONS,
	CHECK_SESSION_STATUS_OPTIONS,
} from '@/features/asset-check/domain/check-session'
import { managerOrAdmin } from '@/lib/auth'

export const CheckSessions: CollectionConfig = {
	slug: 'check-sessions',
	access: {
		// 실행 기록 생성과 완료 저장은 service repository의 trusted write만 우회한다.
		read: managerOrAdmin,
		create: () => false,
		update: () => false,
		delete: managerOrAdmin,
	},
	labels: {
		singular: '이미지 검수',
		plural: '이미지 검수',
	},
	admin: {
		group: '운영 기록',
		useAsTitle: 'source',
		defaultColumns: ['source', 'status', 'imageName', 'createdBy', 'createdAt'],
		description: '검수 실행 1회 단위의 세션 기록입니다.',
	},
	fields: [
		{
			name: 'source',
			type: 'select',
			required: true,
			defaultValue: 'review-page',
			options: [...CHECK_SESSION_SOURCE_OPTIONS],
			admin: {
				description: '검수가 시작된 진입점입니다.',
			},
		},
		{
			name: 'status',
			type: 'select',
			required: true,
			defaultValue: 'running',
			options: [...CHECK_SESSION_STATUS_OPTIONS],
		},
		{
			name: 'targetType',
			type: 'select',
			required: true,
			defaultValue: 'uploaded-image',
			options: [{ label: 'Uploaded Image', value: 'uploaded-image' }],
		},
		{
			name: 'imageName',
			type: 'text',
		},
		{
			name: 'inputSha256',
			type: 'text',
			admin: {
				description: '검수 입력 원본 바이트의 SHA-256입니다.',
			},
		},
		{
			name: 'inputMediaType',
			type: 'select',
			options: CHECK_IMAGE_MEDIA_TYPE_OPTIONS,
		},
		{
			name: 'inputByteLength',
			type: 'number',
			min: 1,
			admin: {
				description: '검수 입력 원본의 바이트 길이입니다.',
				step: 1,
			},
		},
		{
			name: 'rulesetSnapshot',
			type: 'json',
			admin: {
				description: '검수 실행 시점의 Check Scenario 기준 Check 스냅샷입니다.',
			},
		},
		{
			name: 'results',
			type: 'json',
			admin: {
				description: 'rule key별 검수 결과입니다.',
			},
		},
		{
			name: 'pendingCheckKeys',
			type: 'json',
			admin: {
				description: 'AI 후속 검수가 남은 Check key 목록입니다.',
			},
		},
		{
			name: 'agentChatSession',
			type: 'relationship',
			relationTo: 'agent-chat-sessions',
			admin: {
				description: '채팅에서 시작된 검수일 때 원본 Agent Chat Session입니다.',
			},
		},
		{
			name: 'aiUsage',
			type: 'group',
			admin: {
				description: 'AI 검수 비용 분석에 쓰는 모델과 토큰 사용량입니다.',
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
			name: 'errorMessage',
			type: 'textarea',
		},
		{
			name: 'completedAt',
			type: 'date',
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
