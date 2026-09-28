import type { Access, FieldAccess, FieldHook } from 'payload'
import { describe, expect, it } from 'vitest'
import { Users } from '@/collections/Users'

/**
 * manager 권한 모델의 서버 경계 (2026-09-28 결정).
 * 화면이 아니라 여기가 1차 방어선이다 — REST·GraphQL·Local API가 전부 이 함수들을 지난다.
 */

const ONLY_MANAGED = { role: { not_equals: 'admin' } }

const admin = { id: 1, role: 'admin' }
const manager = { id: 2, role: 'manager' }
const worker = { id: 3, role: 'worker' }

const collectionAccess = (name: 'read' | 'create' | 'update' | 'delete' | 'admin'): Access => {
	const fn = Users.access?.[name]
	if (typeof fn !== 'function') throw new Error(`Users.access.${name}이 없습니다.`)
	return fn
}

const roleField = () => {
	const field = Users.fields.find((f) => 'name' in f && f.name === 'role')
	if (!field) throw new Error('role 필드가 없습니다.')
	return field
}

const roleFieldAccess = (name: 'create' | 'update'): FieldAccess => {
	const fn = (roleField() as { access?: Record<string, FieldAccess> }).access?.[name]
	if (typeof fn !== 'function') throw new Error(`role.access.${name}이 없습니다.`)
	return fn
}

const roleBeforeChange = (): FieldHook => {
	const hook = (roleField() as { hooks?: { beforeChange?: FieldHook[] } }).hooks
		?.beforeChange?.[0]
	if (!hook) throw new Error('role.hooks.beforeChange가 없습니다.')
	return hook
}

const call = (access: Access, user: unknown) => access({ req: { user } } as never)

describe('Users 권한 — manager가 계정을 운영한다', () => {
	it('조회: manager는 admin 행을 제외한 전부, worker는 본인만', () => {
		const read = collectionAccess('read')

		expect(call(read, admin)).toBe(true)
		expect(call(read, manager)).toEqual(ONLY_MANAGED)
		expect(call(read, worker)).toEqual({ id: { equals: 3 } })
		expect(call(read, null)).toBe(false)
	})

	it('수정: manager는 admin 행을 고치지 못한다', () => {
		const update = collectionAccess('update')

		expect(call(update, manager)).toEqual(ONLY_MANAGED)
		expect(call(update, worker)).toEqual({ id: { equals: 3 } })
	})

	it('삭제·생성: manager 이상만, 그리고 admin 행은 지우지 못한다', () => {
		expect(call(collectionAccess('delete'), manager)).toEqual(ONLY_MANAGED)
		expect(call(collectionAccess('delete'), worker)).toBe(false)
		expect(call(collectionAccess('create'), manager)).toBe(true)
		expect(call(collectionAccess('create'), worker)).toBe(false)
	})

	it('worker는 Payload Admin에 들어가지 못한다', () => {
		const adminPanel = collectionAccess('admin')

		expect(call(adminPanel, manager)).toBe(true)
		expect(call(adminPanel, worker)).toBe(false)
		expect(call(adminPanel, null)).toBe(false)
	})

	it('role 필드는 manager 이상만 쓴다', () => {
		for (const name of ['create', 'update'] as const) {
			const access = roleFieldAccess(name)
			expect(access({ req: { user: manager } } as never)).toBe(true)
			expect(access({ req: { user: worker } } as never)).toBe(false)
		}
	})

	it('manager는 admin으로 승급시키지 못한다 — admin과 서버 컨텍스트는 통과한다', () => {
		const hook = roleBeforeChange()
		const run = (value: string, user: unknown) => hook({ req: { user }, value } as never)

		expect(() => run('admin', manager)).toThrow()
		expect(run('manager', manager)).toBe('manager')
		expect(run('admin', admin)).toBe('admin')
		// seed·마이그레이션처럼 로그인 사용자가 없는 서버 컨텍스트는 막지 않는다.
		expect(run('admin', null)).toBe('admin')
	})
})
