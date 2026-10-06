'use client'

import { useEffect, useMemo, useState } from 'react'
import { CI_LOCKUP_CONTROLS } from '../ci-lockup/manifest'
import { reducedMotion } from '../ci-lockup/motion'
import { branchLabel, OVERSEAS_BRANCHES, SUBSIDIARIES } from '../ci-lockup/rules'
import { CiLockupView } from '../ci-lockup/view'

/**
 * 이름 한 자리만 갈아 끼우는 히어로.
 *
 * 🔑 락업은 `CiLockupView`가 그대로 그린다 — 축을 **전부 고정해서** 넘기면 알약과 무관하게
 *    자기 값으로만 그려지고(`view.tsx`의 `pick`), 이 위젯이 조판·색·간격을 다시 정의하지 않는다.
 * 🔑 이름이 바뀌면 락업 폭이 바뀌는데, 그 이동은 `LockupFigure`의 FLIP이 이미 이어 준다
 *    (의존 목록이 없어 「무엇이 바뀌었는지」를 몰라도 잡힌다). 그래서 여기 애니메이션 코드가 없다.
 * 🔴 `prefers-reduced-motion`이면 돌리지 않는다 — 끝나지 않는 자동 변화는 그 설정이 막으려는 것 자체다.
 *    ponytail: 멈춤 버튼은 두지 않았다. 필요해지면 축 하나(`paused`)와 버튼 하나다.
 */

/**
 * 이름이 바뀌는 간격(ms) — 자회사·해외지사 히어로가 **같은 상수**를 쓴다.
 *
 * 🔑 `MORPH_MS`(420)보다 길다. 그래서 락업이 자리를 잡은 뒤 다음 이름이 와서 한 번씩 멈췄다 간다.
 *    333ms까지 올려 봤는데(초당 3개) 전환이 끝나기 전에 다음 이름이 와서 판이 계속 미끄러지고,
 *    **밀린 상태의 폭**이 판을 넘어 스크롤바가 튀었다(사용자 지정 2026-08-21: 그 절반 속도).
 * ponytail: 상수 하나 — 축으로 열어야 할 만큼 자주 바뀌면 admin 필드로 올린다.
 */
const CYCLE_MS = 666

/** 🔑 축 목록은 매니페스트에서 파생한다 — 축이 늘면 여기 고정 목록이 저절로 따라온다. */
const ALL_AXES = CI_LOCKUP_CONTROLS.map((control) => control.id)

/**
 * 🔑 자리표시 계열사는 **역할이 반대다.**
 * - 해외지사 히어로: 계열사 자리에 **이것을 고정**한다 — 도는 것은 지역명이고, 거기에 실존 계열사를
 *   세우면 그 조합이 승인된 표기처럼 읽힌다.
 * - 자회사 히어로: 회전에서 **뺀다** — 이름이 무난해서 실존 18개 사이에 섞이면 구별할 길이 없다.
 */
const PLACEHOLDER_SUBSIDIARY = SUBSIDIARIES.find((sub) => sub.placeholder) ?? SUBSIDIARIES[0]
const REAL_SUBSIDIARIES = SUBSIDIARIES.filter((sub) => !sub.placeholder)

/**
 * 한 바퀴치 순서를 섞는다(shuffled bag) — 매번 무작위로 고르면 어떤 이름은 두 번 나오기 전에 다른
 * 이름이 한 번도 안 나온다. 바구니를 비우고 다시 채우면 한 바퀴 안에 전부 한 번씩 나온다.
 *
 * 🔑 **왜 섞나**: 목록이 성격으로 묶여 있다 — 세부사업명을 가진 다섯이 앞에 몰려 있어(`rules.ts`),
 *    순서대로 돌리면 「센터 다섯 → 지역명 열아홉」으로 읽힌다(사용자 지적 2026-08-21). 목록 순서는
 *    admin 드롭다운에서 그 묶음이 유용하므로 그대로 두고, **회전만** 섞는다.
 */
function shuffled(items: readonly string[]): string[] {
	const out = [...items]
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[out[i], out[j]] = [out[j], out[i]]
	}
	return out
}

export type CiLockupHeroSource = 'subsidiary' | 'branch'

export function CiLockupHeroView({
	colors,
	source,
	h,
}: {
	colors: Record<string, string>
	source: CiLockupHeroSource
	h: number
}) {
	const overseas = source === 'branch'
	// 자회사는 국문 이름, 해외지사는 영문 지역명이 돈다(정본 도판이 그렇게 갈라져 있다).
	// 🔴 `useMemo`인 이유는 성능이 아니라 **참조 안정성**이다 — 매 렌더 새 배열이면 아래 effect가
	//    매번 다시 걸려 타이머가 초기화되고 이름이 영원히 첫 것에 머문다.
	const names = useMemo(
		() =>
			overseas ? OVERSEAS_BRANCHES.map(branchLabel) : REAL_SUBSIDIARIES.map((sub) => sub.ko),
		[overseas],
	)
	// 🔴 첫 이름은 **목록 순서 그대로**다 — 서버와 클라이언트가 다른 이름을 그리면 하이드레이션이
	//    어긋난다. 섞는 일은 마운트 뒤 타이머 안에서만 일어난다.
	const [name, setName] = useState(names[0])

	useEffect(() => {
		if (reducedMotion()) return
		let bag: string[] = []
		const timer = setInterval(() => {
			if (bag.length === 0) bag = shuffled(names)
			setName(bag.pop() as string)
		}, CYCLE_MS)
		return () => clearInterval(timer)
	}, [names])

	return (
		<CiLockupView
			colors={colors}
			fixed={{
				hiddenControls: ALL_AXES,
				h,
				// 🔴 해외지사 락업도 자회사명을 함께 쓴다(`rules.ts`의 `overseasLockups`) — 켜 둔다.
				//    🔑 그 자리에는 **자리표시 계열사**를 세운다(사용자 지정 2026-08-21) — 도는 것은
				//    지역명이고, 계열사 자리에 실존 이름을 세우면 그 조합이 승인된 것처럼 읽힌다.
				subsidiaryOn: true,
				subsidiary: overseas ? PLACEHOLDER_SUBSIDIARY.ko : name,
				branchOn: overseas,
				branch: overseas ? name : branchLabel(OVERSEAS_BRANCHES[0]),
				// 국문 가로형A만 `HD`와 회사명이 한 줄로 붙는다 — 히어로가 필요한 것이 그 한 줄이다.
				form: 'horizontalA',
				language: overseas ? 'en' : 'ko',
				colorType: 'fullColor',
				mono: 'BLACK',
				clearSpace: 'off',
				measured: false,
			}}
		/>
	)
}

export default CiLockupHeroView
