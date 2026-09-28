import { Badge } from '@/components/ui/badge'
import type { User } from '@/payload-types'

/**
 * 내 계정에 붙는 역할 뱃지 — **manager와 admin에게만** 선다.
 *
 * 🔴 worker에게는 아무것도 붙이지 않는다. worker는 자기가 「기본 사용자」라고 생각해야 하고,
 *    뱃지는 그 자리에 자기를 가리키는 등급을 만든다(2026-09-28 결정).
 * 🔑 라벨이 갈리는 이유: 앱 안에서 「관리자」는 manager 하나뿐이다(admin은 manager에게 보이지
 *    않는다). admin은 자기 화면에서만 자기 뱃지를 보므로 어휘가 부딪히지 않는다.
 */
const ROLE_BADGE: Partial<Record<User['role'], string>> = {
	admin: '개발자',
	manager: '관리자',
}

export function AccountRoleBadge({ role }: { role: User['role'] }) {
	const label = ROLE_BADGE[role]
	if (!label) return null

	return (
		<Badge variant="tint" shape="pill">
			{label}
		</Badge>
	)
}
