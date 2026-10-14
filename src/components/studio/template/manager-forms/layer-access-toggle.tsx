'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateLayerAccess } from '@/types/template'

type LayerAccessToggleProps = {
	/** 접근 이름 — 「Label: worker가 쓰는 방법」. */
	label: string
	access: TemplateLayerAccess
	busy?: boolean
	onChange: (access: TemplateLayerAccess) => void
	/** 「AI 검수 후 입력」 자리 — 텍스트 칸에만. 아직 없는 값이라 비활성. */
	withAiReview?: boolean
}

/** worker가 이 레이어를 어떻게 쓰나 — Manager mode 폼들이 같이 쓴다. 고르는 즉시 반영된다. */
export function LayerAccessToggle({
	label,
	access,
	busy,
	onChange,
	withAiReview,
}: LayerAccessToggleProps) {
	return (
		<ToggleGroup
			type="single"
			variant="outline"
			size="sm"
			spacing={0}
			value={access}
			disabled={busy}
			onValueChange={(value) =>
				value && value !== access && onChange(value as TemplateLayerAccess)
			}
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
