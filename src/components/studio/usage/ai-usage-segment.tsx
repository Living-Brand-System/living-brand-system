'use client'

import Link from 'next/link'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/**
 * 배타 선택 줄 — 기간 줄과 축 줄이 **같은 컴포넌트를 두 번** 쓴다.
 *
 * 🔴 탭(`role=tablist`)이 아니다. Carbon의 「Content switcher vs Tabs」 기준으로, 탭은 서로
 *    다른 내용을 담은 별개 섹션이고 **같은 데이터를 다르게 자르는 것은 switcher**다. 여기서는
 *    패널을 갈아끼우지 않고 같은 표의 접는 축만 바꾸므로 tablist는 과약속이다.
 * 🔑 각 항목이 Link라서 상태가 URL에 남는다 — 새로고침·링크 공유에 안 날아가고, 화면의 나머지가
 *    전부 서버 컴포넌트로 남는다.
 */
export function AiUsageSegment({
	ariaLabel,
	options,
	value,
}: {
	ariaLabel: string
	options: readonly { value: string; label: string; href: string }[]
	value: string
}) {
	return (
		<ToggleGroup aria-label={ariaLabel} spacing={0} type="single" value={value}>
			{options.map((option) => (
				<ToggleGroupItem asChild key={option.value} value={option.value}>
					{/* scroll=false: 축만 바꿨는데 화면이 맨 위로 튀지 않게 한다. */}
					<Link href={option.href} scroll={false}>
						{option.label}
					</Link>
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
