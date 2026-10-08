'use client'

import { ChevronLeft } from '@carbon/icons-react'
import { useState } from 'react'
import { ReviewFileList } from '@/components/studio/review/review-file-list'
import { ReviewRuleDetail } from '@/components/studio/review/review-rule-detail'
import { ReviewSummary } from '@/components/studio/review/review-summary'
import { StudioSidebar } from '@/components/studio/review/studio-sidebar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import type { CheckSection } from '@/features/asset-check/domain/runtime-check'
import { useCheckImages } from '@/features/asset-check/hooks/use-check-images'

/**
 * 검수 스튜디오의 사이드바(컨트롤러 패널) — 캔버스를 모른다.
 * 목록 ↔ 요약 → 룰 근거 3단 드릴다운을 전부 여기서 소유하고, 파일·판정·실행은 CheckImageProvider가 갖는다.
 * 제목은 Controller.Header가 아니라 본문 안에 둔다 — 디자인의 패널은 제목 아래 구분선이 없다.
 * 디자인 SSOT: Figma HD_LBS_UI section 56:2 "Review Usecase" · 78:3021 "Review Sidebar".
 *
 * 🔴 근거 패널은 캔버스가 아니라 이 사이드바 블록이 확장한다(디자인 78:2706 — 사이드바 프레임이
 *    351→686으로 넓어지고 캔버스가 줄어든다). 셸 열이 auto이므로 패널을 하나 더 그리면 그만큼
 *    캔버스가 물러난다. DOM은 요약→근거 순(읽기 순서)이고, lg의 row-reverse가 근거를 왼쪽에 앉힌다.
 */
export function ReviewSidebar({ sections }: { sections: CheckSection[] }) {
	// 어느 화면을 보고 있는지는 편집 세션이 아니라 이 패널의 표현 상태다.
	const [view, setView] = useState<'list' | 'summary'>('list')
	const { images, scenarios, selected, selectedId, selectedRuleKey, runCheck, runAllChecks } =
		useCheckImages()
	const busy = images.some((image) => image.status === 'running')
	// 발행된 시나리오가 없으면 실행할 룰이 없다 — 눌리고도 아무 일이 없는 버튼을 만들지 않는다.
	const ready = scenarios.length > 0 && !busy
	const summaryOpen = view === 'summary' && selected !== null
	// 판정이 사라진 룰(재검수·시나리오 변경)은 패널이 스스로 닫힌다 — 별도 정리 경로가 필요 없다.
	// 목록으로 돌아가면 근거도 함께 접는다 — 목록 옆에 떠 있는 근거는 어느 파일 것인지 읽히지 않는다.
	const outcome = summaryOpen && selectedRuleKey ? selected.results?.[selectedRuleKey] : undefined

	return (
		<div
			data-slot="review-sidebar"
			className="flex min-h-0 flex-col gap-4 lg:h-full lg:flex-row-reverse"
		>
			<StudioSidebar
				footer={
					<div className="flex gap-2">
						<Button
							type="button"
							variant="highlight"
							className="h-11 flex-1"
							disabled={!selectedId || !ready}
							onClick={runCheck}
						>
							{/* 진행은 목록 행의 스피너가 알린다 — 버튼 이름에 "Loading"이 섞이지 않게 숨긴다. */}
							{busy ? <Spinner aria-hidden /> : null}
							검사
						</Button>
						<Button
							type="button"
							variant="muted"
							className="h-11 flex-1"
							disabled={images.length === 0 || !ready}
							onClick={runAllChecks}
						>
							전부 검사
						</Button>
					</div>
				}
			>
				{/* 목록 화면의 제목은 ReviewFileList가 Controller.Group으로 갖는다 — 되돌아가기 헤더만 여기 남는다. */}
				{summaryOpen ? (
					<>
						<div className="flex h-9 shrink-0 items-center pt-1">
							<button
								type="button"
								onClick={() => setView('list')}
								className="-mx-1 flex items-center gap-1 rounded-md px-1 py-0.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
							>
								<ChevronLeft aria-hidden />
								<Typography
									as="span"
									size="sm"
									weight="semibold"
									className="truncate"
								>
									{selected.name}
								</Typography>
								<span className="sr-only">목록으로 돌아가기</span>
							</button>
						</div>
						<ReviewSummary sections={sections} />
					</>
				) : (
					<ReviewFileList onOpen={() => setView('summary')} />
				)}
			</StudioSidebar>
			{outcome && <ReviewRuleDetail outcome={outcome} />}
		</div>
	)
}
