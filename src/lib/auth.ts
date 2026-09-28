import type { Access, CollectionConfig, FieldAccess, Where } from 'payload'
import type { User } from '@/payload-types'

/**
 * 역할 기반 접근 제어 헬퍼.
 * 컬렉션/필드 access 함수는 서버에서 권한을 강제하는 1차 보안 경계다 (docs/07).
 * UI 표시 여부와 무관하게 REST/GraphQL/Local API 모두 여기를 통과해야 한다.
 */

export type Role = 'admin' | 'manager' | 'worker'

const roleOf = (user: unknown): Role | null => {
	if (user && typeof user === 'object' && 'role' in user) {
		const r = (user as { role?: unknown }).role
		if (r === 'admin' || r === 'manager' || r === 'worker') return r
	}
	return null
}

export const isAdmin = (user: unknown): boolean => roleOf(user) === 'admin'

/** 컬렉션 access 밖(커스텀 라우트 핸들러)에서도 쓰는 사용자 단위 역할 검사. */
export const isManager = (user: unknown): boolean => {
	const r = roleOf(user)
	return r === 'admin' || r === 'manager'
}

/** Payload 인증 결과가 애플리케이션 User 문서인지 확인한다. */
export const isPayloadUser = (user: unknown): user is User =>
	Boolean(user && typeof user === 'object' && 'role' in user && 'email' in user)

const isAuthenticated = (user: unknown): boolean => Boolean(user)

// --- 컬렉션 access ---
export const authenticated: Access = ({ req }) => isAuthenticated(req.user)
export const managerOrAdmin: Access = ({ req }) => isManager(req.user)
export const adminOnly: Access = ({ req }) => isAdmin(req.user)

/** 공용 access 프리셋 — 누구나 읽되(인증), 변경은 manager/admin만 (Worker는 사용만). */
export const managerManagedAccess: CollectionConfig['access'] = {
	read: authenticated,
	create: managerOrAdmin,
	update: managerOrAdmin,
	delete: managerOrAdmin,
}

/**
 * manager가 운영하는 세계에는 `worker`와 `manager`만 있다 — admin 행은 보이지도 고쳐지지도 않는다.
 * (2026-09-28 결정: manager는 admin이 될 수 없고, admin 계정을 삭제·강등할 수도 없다.)
 */
const nonAdminRows: Where = { role: { not_equals: 'admin' } }

/** 본인 문서이거나, manager가 다루는 비-admin 문서 (Users 조회/수정용) */
export const selfOrManaged: Access = ({ req }) => {
	if (isAdmin(req.user)) return true
	if (isManager(req.user)) return nonAdminRows
	const uid = (req.user as { id?: string | number } | null)?.id
	if (uid == null) return false
	return { id: { equals: uid } }
}

/** manager 이상만, 단 admin 문서는 건드리지 못한다 (Users 삭제용) */
export const managedRowsOnly: Access = ({ req }) => {
	if (isAdmin(req.user)) return true
	return isManager(req.user) ? nonAdminRows : false
}

// --- 필드 access ---
/** role 지정·변경은 manager 이상. `admin` 값을 넣는 것은 role 필드 hook이 따로 막는다. */
export const managerFieldOnly: FieldAccess = ({ req }) => isManager(req.user)
