import { ArrowsHorizontal, ArrowsVertical } from '@carbon/icons-react'
import { ControllerStack } from '@/components/shared/controller'
/** 샘플·실제 템플릿이 공유하는 고정 출력 크기 표면. 치수와 단위는 호출자가 정한다. */
export function OutputDimensions({
	width,
	height,
	unit,
}: {
	width: string
	height: string
	unit: 'mm' | 'px'
}) {
	return (
		<ControllerStack
			labelDisplay="icon"
			items={[
				{ id: 'width', label: '출력 너비', icon: <ArrowsHorizontal />, value: width },
				{ id: 'height', label: '출력 높이', icon: <ArrowsVertical />, value: height },
			].map(({ value, ...item }) => ({
				...item,
				readonly: true,
				children: (
					<div className="flex min-w-0 flex-1 items-center justify-end gap-1 text-sm">
						<span>{value}</span>
						<span className="shrink-0 text-muted-foreground">{unit}</span>
					</div>
				),
			}))}
		/>
	)
}
