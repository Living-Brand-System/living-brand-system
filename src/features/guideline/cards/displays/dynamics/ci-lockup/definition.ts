import type { Field } from 'payload'
import { defineDisplay } from '@/features/guideline/cards/displays/definition'
import { CI_LOCKUP_CONTROL_IDS, CI_LOCKUP_CONTROLS } from './manifest'

// CI 조합형 조립 위젯 — Block children에 등록되는 인터랙티브 leaf.
//
// 단계(본사→자회사→해외지사)를 고르면 그 계층의 락업이 파생돼 나온다. 미리 정한 목록을 나열하는 것이
// 아니라 심볼 + 폰트 조판으로 조립하므로, 계열사·지부가 늘어도 배리언트가 곱셈으로 터지지 않는다.
//
// 🔴 컨트롤은 이 위젯이 그리지 않는다 — `manifest.ts`가 선언하고 하단 알약이 그린다(`docs/11` §4.1).
//    여기 필드는 그 알약을 **좁히는 제한**이고, 축마다 두 가지를 정한다(사용자 지정 2026-08-19):
//      ① 초기값 — 페이지를 처음 열었을 때 보이는 상태
//      ② 제공 여부 — 그 축의 비교가 이 자리에서 필요한가(`hiddenControls`가 뺄 것을 담는다)
//    변환은 `controllers/registry.ts`가 갖는다.
// 🔑 그래서 「페이지 제목이 곧 규정」이 성립한다 — 영문형 페이지는 언어를 영문으로 심고 그 축을 빼면
//    거기서 국문이 나올 길이 없다.
//
// dbName 짧게(cil)로 중첩 테이블명 63자 방어. slug 14자 → `alias-length.test.ts`가 지킨다.

/**
 * 축 하나의 **초기값** 필드. 🔑 매니페스트에서 생성한다 — 축·선택지·라벨을 두 번 적지 않는다.
 * 🔴 `select`는 Postgres enum이 된다. 계열사 목록이 바뀌면 마이그레이션이 필요하다 — 그 값이
 *    콘텐츠가 아니라 스키마이기 때문이고, `rules.ts`가 정본이므로 목록 변경은 이미 코드 변경이다.
 */
function initialValueField(control: (typeof CI_LOCKUP_CONTROLS)[number]): Field {
	const admin = { description: `초기값 — ${control.label}.` }
	if (control.kind === 'toggle') {
		return { name: control.id, type: 'checkbox', defaultValue: control.defaultValue, admin }
	}
	if (control.kind === 'range') {
		// 🔴 범위는 매니페스트에서 온다 — admin 입력과 알약이 같은 범위를 쓴다.
		return {
			name: control.id,
			type: 'number',
			defaultValue: control.defaultValue,
			min: control.min,
			max: control.max,
			admin: { description: `초기값 — ${control.label} (${control.min}~${control.max}).` },
		}
	}
	return {
		name: control.id,
		type: 'select',
		defaultValue: control.defaultValue,
		options: control.options.map((option) => ({ value: option.value, label: option.label })),
		admin,
	}
}

export const ciLockup = defineDisplay({
	id: 'ciLockupWidget',
	type: 'dynamic',
	category: 'identity',
	sizing: 'contain',
	downloads: ['svg'],
	dbName: 'cil',
	name: 'CI 조합형',
	description:
		'심볼과 워드마크를 규정에 따라 조합하고, 카드별 컨트롤로 꼴·언어·색상 표현을 확인합니다.',
	fields: [
		...CI_LOCKUP_CONTROLS.map(initialValueField),
		{
			name: 'heightControl',
			type: 'checkbox',
			defaultValue: false,
			admin: {
				description:
					'H를 알약에 노출합니다. 기본은 꺼짐 — H는 독자가 고를 값이 아니라 나란히 놓인 락업들의 비율을 맞추려고 저작자가 정하는 값입니다.',
			},
		},
		{
			name: 'hiddenControls',
			type: 'select',
			hasMany: true,
			// 🔑 목록은 매니페스트에서 온다 — 축을 늘리면 여기 선택지도 저절로 따라온다.
			options: CI_LOCKUP_CONTROL_IDS,
			admin: {
				description:
					'알약에서 뺄 축. 뺀 축은 위 초기값에 고정됩니다(예: 자회사 토픽에서 해외지사·지사명).',
			},
		},
	],
})

export default ciLockup
