import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { Forbidden } from 'payload'
import {
	isAdmin,
	isManager,
	managedRowsOnly,
	managerFieldOnly,
	managerOrAdmin,
	selfOrManaged,
} from '@/lib/auth'

const revokeMcpKeysOfUser: CollectionBeforeDeleteHook = async ({ id, req }) => {
	await req.payload.delete({
		collection: 'payload-mcp-api-keys',
		overrideAccess: true,
		req,
		where: { user: { equals: id } },
	})
}

export const Users: CollectionConfig = {
	slug: 'users',
	labels: {
		singular: '사용자 설정',
		plural: '사용자 설정',
	},
	admin: {
		useAsTitle: 'email',
		group: '시스템 관리',
	},
	auth: {
		// 운영은 30분 제한 (docs/07 #4). 로컬 dev는 자동 로그아웃이 방해되므로 30일로 늘린다(보안 규정은 운영에만 적용).
		tokenExpiration: process.env.NODE_ENV === 'production' ? 1800 : 60 * 60 * 24 * 30,
	},
	access: {
		// 계정 운영은 manager가 한다(2026-09-28 결정). worker는 본인 문서만 보고 고친다.
		read: selfOrManaged,
		create: managerOrAdmin,
		update: selfOrManaged,
		delete: managedRowsOnly,
		// worker는 Payload Admin이 있다는 사실 자체를 몰라야 한다. (admin access는 boolean만 받는다)
		admin: ({ req }) => isManager(req.user),
	},
	hooks: {
		// 🔴 계정을 지우기 전에 그 사람의 MCP 키를 회수한다. 주인 없는 API 키는 남길 것이 아니고,
		//    DB의 `payload_mcp_api_keys.user_id`가 NOT NULL이라 그냥 두면 DELETE 자체가 거부된다.
		//    plugin이 소유한 컬렉션이라 스키마를 우리가 못 고친다 — 그래서 여기서 먼저 지운다.
		beforeDelete: [revokeMcpKeysOfUser],
	},
	fields: [
		{
			name: 'role',
			type: 'select',
			required: true,
			defaultValue: 'worker',
			saveToJWT: true,
			options: [
				{ label: 'Admin', value: 'admin' },
				{ label: 'Manager', value: 'manager' },
				{ label: 'Worker', value: 'worker' },
			],
			access: {
				// 승급·강등은 manager 이상 (worker가 스스로 올라가지 못하게)
				create: managerFieldOnly,
				update: managerFieldOnly,
			},
			hooks: {
				// 🔴 manager가 고를 수 있는 값은 worker ↔ manager 둘뿐이다. 필드 access는 값을 보지 못하므로
				//    여기서 막는다. 로그인한 사용자가 아닌 요청(seed 등 서버 컨텍스트)은 대상이 아니다.
				beforeChange: [
					({ req, value }) => {
						if (value === 'admin' && req.user && !isAdmin(req.user)) {
							throw new Forbidden(req.t)
						}
						return value
					},
				],
			},
			admin: { description: 'admin(전체)·manager(계정·기준 관리)·worker(사용)' },
		},
		{
			// Figma 개인 API 토큰의 암호문(`lib/secret-box`). 템플릿 가져오기는 요청한 사람의 토큰으로
			// Figma를 읽는다 — 서버 공용 토큰은 없다(한 사람 계정에 묶이지 않게).
			// 🔴 API·Admin 어디로도 내보내지 않는다. 읽기·쓰기는 figma-token repository가 overrideAccess로만 한다.
			name: 'figmaToken',
			type: 'text',
			access: { read: () => false, create: () => false, update: () => false },
			admin: { hidden: true },
		},
		{
			// 이 계정의 AI 토큰 한도 — 비운 칸은 전역 설정 `ai-token-limits`를 따르고, 「한도 없음」이면 무제한이다.
			// 🔴 본인이 자기 한도를 풀 수 없게 읽기·쓰기 모두 manager 이상이다(docs/07).
			name: 'tokenLimits',
			type: 'group',
			label: 'AI 토큰 한도',
			access: { read: managerFieldOnly, create: managerFieldOnly, update: managerFieldOnly },
			fields: [
				{ name: 'unlimited', type: 'checkbox', label: '한도 없음', defaultValue: false },
				{
					name: 'daily',
					type: 'number',
					label: '일 한도 (비우면 기본값)',
					min: 1,
					admin: { condition: (_, sibling) => !sibling?.unlimited },
				},
				{
					name: 'monthly',
					type: 'number',
					label: '월 한도 (비우면 기본값)',
					min: 1,
					admin: { condition: (_, sibling) => !sibling?.unlimited },
				},
			],
		},
	],
}
