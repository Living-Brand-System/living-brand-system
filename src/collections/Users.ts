import type { CollectionConfig } from 'payload'
import { Forbidden } from 'payload'
import {
	isAdmin,
	isManager,
	managedRowsOnly,
	managerFieldOnly,
	managerOrAdmin,
	selfOrManaged,
} from '@/lib/auth'

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
	],
}
