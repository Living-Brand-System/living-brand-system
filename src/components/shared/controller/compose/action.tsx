'use client'

import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROW_ACTION } from '../internal/classes'

/**
 * Row/Field 면 위에 앉는 아이콘 버튼 — 값을 바꾸지 않고 값에 무언가를 하는 자리(복사 등).
 * 첫 소비자는 MCP 화면의 명령 복사 버튼(디자인 64:1283)이다.
 *
 * 🔴 아이콘만 담으므로 `aria-label`이 이 버튼의 유일한 이름이다 — 없으면 스크린리더에서 이름 없는
 *    버튼이 된다. 아이콘에는 `aria-hidden`을 준다(docs/08).
 *
 * 무엇을 여는 트리거가 아니다. 패널·브라우저를 여는 버튼은 `Controller.Browser.Trigger`가 소유한다
 * (docs/10 §3.6 — 무엇을 여는지 모르는 범용 트리거는 만들지 않는다).
 */
export function ControllerAction({
	className,
	...props
}: React.ComponentProps<typeof Button> & { 'aria-label': string }) {
	return (
		<Button
			data-slot="controller-action"
			size="icon-sm"
			type="button"
			variant="ghost"
			className={cn(ROW_ACTION, className)}
			{...props}
		/>
	)
}
