'use client'

import { ControllerRange } from '@/components/shared/controller'

/**
 * 🔑 「100%」는 원본 픽셀이 아니라 **스테이지 꽉 채움**이다 — 기준 크기를 `fitPreviewSize`가
 *    실측으로 정하고 이 값이 그 위에 곱해진다. 그래서 기본이 100%면 프리뷰가 가용 영역에 딱 맞고,
 *    줄이는 쪽으로만 움직인다(2026-09-08에 50→100).
 */
export const DEFAULT_PREVIEW_SIZE = 100

/**
 * 출력에는 영향 없이 데스크톱 캔버스의 표시 크기만 조절한다.
 * 트랙·채움·키보드는 킷의 Value Range 프리미티브가 소유한다(docs/10 §3.6) — 여기서는
 * 이 컨트롤이 무엇을 재는지(라벨·범위·표기)만 고정한다.
 * 떠 있는 자리는 `ControllerBar`가 갖는다(`components/shared/controller/bar.tsx`).
 */
export function PreviewSizeControl({
	value,
	onChange,
}: {
	value: number
	onChange: (value: number) => void
}) {
	return (
		<ControllerRange
			label="Preview Size"
			value={value}
			min={25}
			max={100}
			step={5}
			format={(size) => `${size}%`}
			onChange={onChange}
			className="w-48"
		/>
	)
}
