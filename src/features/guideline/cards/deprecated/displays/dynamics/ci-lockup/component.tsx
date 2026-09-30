import { findCiLockupColors } from '@/features/guideline/repositories/ci-lockup-colors.payload.repository'
import type { CiLockupWidget as CiLockupWidgetRow } from '@/payload-types'
import { type CiLockupFixed, CiLockupView } from './view'

export async function CiLockupWidget({ fixed }: { fixed?: CiLockupFixed }) {
	return <CiLockupView colors={await findCiLockupColors()} fixed={fixed} />
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function CiLockupDisplay({ display }: { display: CiLockupWidgetRow }) {
	return (
		// 🔑 축마다의 고정값을 그대로 넘긴다 — 알약에서 뺀 축에만 적용된다(`view.tsx`의 `pick`). 카드 안에서는
		//    카드별 컨트롤러 스코프가 초기값과 숨긴 축 제한을 공유한다.
		<CiLockupWidget
			fixed={{
				h: display.h,
				subsidiaryOn: display.subsidiaryOn,
				subsidiary: display.subsidiary,
				branchOn: display.branchOn,
				branch: display.branch,
				form: display.form,
				language: display.language,
				colorType: display.colorType,
				mono: display.mono,
				clearSpace: display.clearSpace,
				measured: display.measured,
				heightControl: display.heightControl,
				hiddenControls: display.hiddenControls,
			}}
		/>
	)
}
