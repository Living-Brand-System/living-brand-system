'use client'

import { useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateLayerAccess } from '@/types/template'

type LayerAccessToggleProps = {
	/** 접근 이름 — 「Label: worker가 쓰는 방법」. */
	label: string
	access: TemplateLayerAccess
	busy?: boolean
	/** 저장을 시작한다 — `false`로 끝나면(실패) 누른 값을 되돌린다. */
	onChange: (access: TemplateLayerAccess) => unknown
	/** 「AI 검수 후 입력」 자리 — 텍스트 칸에만. 아직 없는 값이라 비활성. */
	withAiReview?: boolean
}

/**
 * worker가 이 레이어를 어떻게 쓰나 — Manager mode 폼들이 같이 쓴다. 누른 값은 저장을 기다리지 않고 바로 보인다
 * (저장·화면 갱신은 1초 가까이 걸린다, 2026-10-14 실측). 서버 값이 따라오면 그것을 보이고, 실패하면 되돌린다.
 */
export function LayerAccessToggle({
	label,
	access,
	busy,
	onChange,
	withAiReview,
}: LayerAccessToggleProps) {
	// 누른 값 — 누를 때의 서버 값(`from`)이 그대로인 동안만 쓴다. 서버 값이 바뀌면 그쪽이 맞는 값이다.
	const [pressed, setPressed] = useState<{
		value: TemplateLayerAccess
		from: TemplateLayerAccess
	} | null>(null)
	const shown = pressed && pressed.from === access ? pressed.value : access
	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			value={shown}
			onValueChange={(value) => {
				// 저장 중에 또 누르면 받지 않는다 — 읽고-고쳐-쓰기 둘이 겹치면 하나가 덮인다.
				if (!value || value === shown || busy) return
				const next = value as TemplateLayerAccess
				setPressed({ value: next, from: access })
				Promise.resolve(onChange(next)).then((ok) => {
					if (ok === false) setPressed(null)
				})
			}}
			aria-label={label}
			className="w-full flex-wrap"
		>
			<ToggleGroupItem value="readonly">값 고정</ToggleGroupItem>
			<ToggleGroupItem value="editable">입력 가능</ToggleGroupItem>
			<ToggleGroupItem value="hidden">숨김</ToggleGroupItem>
			{/* ponytail: 자리만 — 저장할 값도, 입력 단계 검수 흐름도 아직 없다(별도 브랜치). */}
			{withAiReview && (
				<ToggleGroupItem value="ai-review" disabled>
					AI 검수 후 입력
				</ToggleGroupItem>
			)}
		</ToggleGroup>
	)
}
