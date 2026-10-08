import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AiCheckResult, CheckResult } from '@/features/asset-check/checkers/types'
import type { CheckSection } from '@/features/asset-check/domain/runtime-check'
import type { CheckImage, CheckImageContextValue } from '@/features/asset-check/types'

const useCheckImages = vi.fn<() => CheckImageContextValue>()
vi.mock('@/features/asset-check/hooks/use-check-images', () => ({
	useCheckImages: () => useCheckImages(),
}))

const { ReviewSidebar } = await import('./review-sidebar')

describe('ReviewSidebar', () => {
	afterEach(cleanup)

	it('파일이 없으면 목록 자리가 드롭존이 된다', () => {
		useCheckImages.mockReturnValue(context({ images: [] }))
		render(<ReviewSidebar sections={sections} />)

		expect(screen.getByText('List')).toBeInTheDocument()
		expect(screen.getByText('Drag & Drop')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '전부 검사' })).toBeDisabled()
	})

	it('행에 시나리오와 파일 이름을 싣고 판정은 누를 수 없게 표시한다', () => {
		const image = checkImage({ results: { 'color.palette': result('fail') } })
		useCheckImages.mockReturnValue(context({ images: [image], selected: image }))
		const { container } = render(<ReviewSidebar sections={sections} />)

		expect(screen.getByText('빠른 기본 검수')).toBeInTheDocument()
		expect(screen.getByText('test.png')).toBeInTheDocument()
		// 판정은 표시 전용이다 — 행 버튼 하나 말고 다른 버튼이 행 안에 생기면 안 된다.
		const row = container.querySelector('[data-slot="controller-list-row"]')
		expect(row).not.toBeNull()
		// 행 자체가 버튼이므로 그 안에 또 다른 버튼이 생기면 안 된다 — 판정은 표시 전용이다.
		expect(row?.querySelectorAll('button')).toHaveLength(0)
		expect(screen.getByText('미통과')).toBeInTheDocument()
	})

	it('행을 열면 요약으로 내려가고 뒤로 목록에 돌아온다', () => {
		const image = checkImage({ results: { 'color.palette': result('fail') } })
		useCheckImages.mockReturnValue(context({ images: [image], selected: image }))
		render(<ReviewSidebar sections={sections} />)

		fireEvent.click(screen.getByText('test.png'))
		expect(screen.getByText('Summary')).toBeInTheDocument()
		expect(screen.queryByText('List')).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: /목록으로 돌아가기/ }))
		expect(screen.getByText('List')).toBeInTheDocument()
	})

	it('요약 카드가 룰 판정과 관측 최저 신뢰도를 보여준다', () => {
		const image = checkImage({ results: { 'color.palette': aiResult([90, 75]) } })
		useCheckImages.mockReturnValue(context({ images: [image], selected: image }))
		render(<ReviewSidebar sections={sections} />)

		fireEvent.click(screen.getByText('test.png'))
		const card = screen.getByRole('button', { name: /color\.palette/ })
		// 파일 종합 판정과 룰 판정이 같은 낱말을 쓸 수 있어 카드 안으로 범위를 좁힌다.
		expect(within(card).getByText('검토')).toBeInTheDocument()
		expect(within(card).getByText('75%')).toBeInTheDocument()
	})

	it('요약 카드를 누르면 그 룰의 근거를 편다', () => {
		const selectRule = vi.fn()
		const image = checkImage({ results: { 'color.palette': aiResult([90, 75]) } })
		useCheckImages.mockReturnValue(context({ images: [image], selected: image, selectRule }))
		render(<ReviewSidebar sections={sections} />)

		fireEvent.click(screen.getByText('test.png'))
		fireEvent.click(screen.getByRole('button', { name: /color\.palette/ }))
		expect(selectRule).toHaveBeenCalledWith('color.palette')
	})

	it('이미 펼친 카드를 다시 누르면 근거를 닫는다', () => {
		const selectRule = vi.fn()
		const image = checkImage({ results: { 'color.palette': aiResult([90]) } })
		useCheckImages.mockReturnValue(
			context({
				images: [image],
				selected: image,
				selectedRuleKey: 'color.palette',
				selectRule,
			}),
		)
		render(<ReviewSidebar sections={sections} />)

		fireEvent.click(screen.getByText('test.png'))
		fireEvent.click(screen.getByRole('button', { name: /color\.palette/ }))
		expect(selectRule).toHaveBeenCalledWith(null)
	})

	it('전부 검사가 순차 실행을 호출한다', () => {
		const runAllChecks = vi.fn()
		const image = checkImage({})
		useCheckImages.mockReturnValue(context({ images: [image], selected: image, runAllChecks }))
		render(<ReviewSidebar sections={sections} />)

		fireEvent.click(screen.getByRole('button', { name: '전부 검사' }))
		expect(runAllChecks).toHaveBeenCalledOnce()
	})

	it('실행 CTA는 디자인 토큰 variant를 쓰고 pill이 아니다', () => {
		const image = checkImage({})
		useCheckImages.mockReturnValue(context({ images: [image], selected: image }))
		render(<ReviewSidebar sections={sections} />)

		// 그라디언트는 --highlight-background 토큰이 갖는다 — 생 팔레트로 칠하지 않는다(docs/09 §4).
		expect(screen.getByRole('button', { name: '검사' })).toHaveAttribute(
			'data-variant',
			'highlight',
		)
		expect(screen.getByRole('button', { name: '전부 검사' })).toHaveAttribute(
			'data-variant',
			'muted',
		)
		expect(screen.getByRole('button', { name: '검사' })).not.toHaveAttribute(
			'data-shape',
			'pill',
		)
	})

	it('검수가 도는 동안 두 실행 버튼을 모두 잠근다', () => {
		const image = checkImage({ status: 'running' })
		useCheckImages.mockReturnValue(context({ images: [image], selected: image }))
		render(<ReviewSidebar sections={sections} />)

		expect(screen.getByRole('button', { name: '검사' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '전부 검사' })).toBeDisabled()
	})

	it('요약에서 펼친 룰의 근거 패널이 사이드바 블록 안에 붙는다', () => {
		// 확장은 캔버스가 아니라 사이드바 쪽이다(디자인 78:2706) — 패널이 이 컴포넌트의 형제로 는다.
		const image = checkImage({ results: { 'color.palette': aiResult([90, 75]) } })
		useCheckImages.mockReturnValue(
			context({ images: [image], selected: image, selectedRuleKey: 'color.palette' }),
		)
		const { container } = render(<ReviewSidebar sections={sections} />)

		fireEvent.click(screen.getByText('test.png'))

		const root = container.querySelector('[data-slot="review-sidebar"]')
		const detail = container.querySelector('[data-slot="review-rule-detail"]')
		expect(root).toContainElement(detail as HTMLElement)
		expect(screen.getByText('question 0')).toBeInTheDocument()
	})

	it('목록 화면에서는 근거 패널을 그리지 않는다', () => {
		// 목록 옆에 떠 있는 근거는 어느 파일 것인지 읽히지 않는다 — 요약이 열려 있을 때만 편다.
		const image = checkImage({ results: { 'color.palette': aiResult([90]) } })
		useCheckImages.mockReturnValue(
			context({ images: [image], selected: image, selectedRuleKey: 'color.palette' }),
		)
		const { container } = render(<ReviewSidebar sections={sections} />)

		expect(container.querySelector('[data-slot="review-rule-detail"]')).toBeNull()
	})

	it('판정이 사라진 룰은 근거 패널이 스스로 닫힌다', () => {
		// 재검수·시나리오 변경으로 results가 비면 selectedRuleKey가 남아 있어도 그릴 것이 없다.
		const image = checkImage({})
		useCheckImages.mockReturnValue(
			context({ images: [image], selected: image, selectedRuleKey: 'color.palette' }),
		)
		const { container } = render(<ReviewSidebar sections={sections} />)

		fireEvent.click(screen.getByText('test.png'))
		expect(container.querySelector('[data-slot="review-rule-detail"]')).toBeNull()
	})
})

const scenarios = [{ key: 'quick', title: '빠른 기본 검수', checkKeys: ['color.palette'] }]

const sections: CheckSection[] = [
	{
		title: 'Color System',
		slug: 'color-system',
		groupTitle: 'Brand Design Elements',
		groupSlug: 'brand-design-elements',
		chapterTitle: 'Brand Design Elements',
		chapterSlug: 'brand-design-elements',
		chapterOrder: 1,
		topicTitle: 'Color System',
		topicSlug: 'color-system',
		topicOrder: 1,
		checks: [
			{
				key: 'color.palette',
				title: 'color.palette',
				checker: { key: 'test-checker', type: 'deterministic' },
				executor: 'deterministic',
				implemented: true,
				evidence: '',
				referenceAssets: [],
			},
		],
	},
]

function checkImage(patch: Partial<CheckImage>): CheckImage {
	return {
		id: 'image-1',
		url: 'blob:test',
		name: 'test.png',
		file: {} as File,
		scenarioKey: 'quick',
		status: 'completed',
		...patch,
	}
}

function context(patch: Partial<CheckImageContextValue>): CheckImageContextValue {
	return {
		scenarios,
		images: [],
		selectedId: 'image-1',
		selected: null,
		select: vi.fn(),
		addFiles: vi.fn(),
		scenarioKey: 'quick',
		setScenarioKey: vi.fn(),
		showFailOnly: false,
		toggleFailOnly: vi.fn(),
		runCheck: vi.fn(),
		runAllChecks: vi.fn(),
		selectedRuleKey: null,
		selectRule: vi.fn(),
		...patch,
	}
}

function result(status: CheckResult['rawResult']['status']): CheckResult {
	return {
		rule: { key: 'color.palette', title: 'color.palette', executor: 'deterministic' },
		checker: { key: 'color.palette', type: 'algorithm' },
		rawResult: { status, fulfillment: null },
	}
}

// 🔴 confidence는 0~1이 아니라 0~100이다(ai-observation-task의 프롬프트 계약).
function aiResult(confidences: number[]): CheckResult {
	const observations: AiCheckResult['observations'] = confidences.map((confidence, index) => ({
		criterionId: `c-${index}`,
		question: `question ${index}`,
		expected: 'present',
		actual: 'uncertain',
		confidence,
		reason: 'reason',
		satisfied: null,
	}))

	return {
		rule: { key: 'color.palette', title: 'color.palette', executor: 'heuristic' },
		checker: { key: 'ai', type: 'ai' },
		rawResult: { status: 'needs_review', fulfillment: null, observations },
	}
}
