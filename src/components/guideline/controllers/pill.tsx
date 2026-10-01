'use client'

import { Fragment } from 'react'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'

/**
 * 실효 그룹을 하단 알약 한 줄로 그린다. **도메인을 모른다** — `kind`만 보고 프리미티브를 고르는
 * 일은 `ControllerControlRenderer`가 이미 하므로 여기서는 배치만 소유한다.
 *
 * 사이드바 렌더러(`ControllerRenderer`)와 다른 점은 둘뿐이다:
 * - 그룹을 접이식 제목이 아니라 **구분선**으로 가른다(Figma HD_LBS_UI 61:4672).
 * - 🔴 `readonly` 컨트롤을 **싣지 않는다.** 떠 있는 바에 못 만지는 판독 줄이 끼면 폭만 먹고,
 *   admin이 고정한 값은 그림 자체가 이미 보여준다. 값은 그대로 남으므로 판형은 고정값으로 그려진다
 *   (Figma의 Layout Type 1이 마진 하나만 실은 것이 이 경우다).
 */
export function GuidelineControllerPill() {
	const { groups, values, set, reset } = useGuidelineController()

	const visible = groups
		.map((group) => ({
			...group,
			controls: group.controls.filter((control) => control.availability !== 'readonly'),
		}))
		.filter((group) => group.controls.length > 0)

	if (visible.length === 0) return null

	return (
		<>
			{visible.map((group, index) => (
				<Fragment key={group.id}>
					{index > 0 && (
						// 🔴 `self-center`만으로는 안 된다. Separator의 기본 클래스에
						//    `data-[orientation=vertical]:self-stretch`가 있어 바의 `items-center`를
						//    덮는데, 변형 선택자는 특이도가 더 높아 맨 `self-center`가 진다.
						//    같은 변형으로 맞받아야 가운데로 온다.
						<Separator
							orientation="vertical"
							className="h-6 data-[orientation=vertical]:self-center"
						/>
					)}
					{group.controls.map((control) => (
						// 🔴 최소폭이 없으면 값이 바뀔 때마다 컨트롤이 늘었다 줄었다 하고, 알약 전체와
						//    그 안의 이웃까지 함께 움직인다(`4.5%` → `100%`에서 실제로 출렁였다).
						//    고정폭이 아니라 **최소폭**인 이유는 라벨 길이가 컨트롤마다 달라서다.
						<div
							key={control.id}
							className={control.kind === 'text' ? 'min-w-0' : 'min-w-[200px]'}
						>
							<ControllerControlRenderer
								definition={control}
								value={
									control.id in values ? values[control.id] : control.defaultValue
								}
								onChange={(value) => set(control.id, value)}
							/>
						</div>
					))}
				</Fragment>
			))}
			<Button type="button" variant="ghost" size="sm" onClick={reset}>
				초기화
			</Button>
		</>
	)
}
