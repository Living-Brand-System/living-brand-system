import { describe, expect, it } from 'vitest'
import { type GeneratedImageHistoryItem, groupHistoryByDate } from './generated-image-history'

/**
 * 🔴 로컬 시각으로 만든다. 묶기 경계가 **보는 사람의 로컬 자정**이라, 날짜 문자열에 오프셋을
 *    박아 두면 러너 타임존에 따라 하루가 밀린다(2026-09-22에 CI가 UTC라 실제로 밀렸다).
 */
function at(year: number, month: number, day: number, hour: number): string {
	return new Date(year, month - 1, day, hour).toISOString()
}

function item(
	id: number,
	createdAt: string,
	batchKey: string | null = null,
): GeneratedImageHistoryItem {
	return {
		aspectRatio: '1:1',
		batchKey,
		createdAt,
		id,
		imageSize: '1K',
		profileId: 6,
		profileName: 'Technical Illustration',
		prompt: '강아지',
		url: `/file/${id}.jpg`,
	}
}

describe('groupHistoryByDate', () => {
	// 로컬 자정이 경계다 — 한국(UTC+9)에서 09-21 01:00은 오늘이고, 09-20 23:00 UTC도 오늘이다.
	const today = new Date(2026, 8, 21, 12)

	it('오늘·어제는 이름으로, 그 앞은 날짜로 적는다', () => {
		const groups = groupHistoryByDate(
			[
				item(1, at(2026, 9, 21, 1)),
				item(2, at(2026, 9, 20, 22)),
				item(3, at(2026, 9, 11, 9)),
				item(4, at(2025, 12, 24, 9)),
			],
			today,
		)

		expect(groups.map((group) => group.label)).toEqual([
			'오늘',
			'어제',
			'9월 11일',
			'2025년 12월 24일',
		])
		expect(groups.map((group) => group.stacks.length)).toEqual([1, 1, 1, 1])
	})

	it('같은 날이 이어지면 한 묶음이 된다', () => {
		const groups = groupHistoryByDate(
			[
				item(1, at(2026, 9, 21, 15)),
				item(2, at(2026, 9, 21, 9)),
				item(3, at(2026, 9, 20, 9)),
			],
			today,
		)

		expect(groups).toHaveLength(2)
		expect(groups[0]?.stacks.map((stack) => stack.items[0]?.id)).toEqual([1, 2])
	})

	// 🔴 날짜별로 다시 모으지 않는다 — 최신순이 깨진 목록이 와도 순서를 그대로 둔다.
	//    다시 모으면 페이지가 이어 붙을 때 이미 그린 그룹에 항목이 끼어들어 격자가 흔들린다.
	it('같은 날짜가 떨어져 있으면 묶지 않고 순서를 지킨다', () => {
		const groups = groupHistoryByDate(
			[item(1, at(2026, 9, 21, 9)), item(2, at(2026, 9, 20, 9)), item(3, at(2026, 9, 21, 8))],
			today,
		)

		expect(groups.map((group) => group.label)).toEqual(['오늘', '어제', '오늘'])
	})

	it('빈 목록은 그룹도 없다', () => {
		expect(groupHistoryByDate([], today)).toEqual([])
	})
})

describe('한 번에 생성한 것 묶기', () => {
	const today = new Date(2026, 8, 21, 12)

	it('같은 batchKey가 이어지면 한 겹침이 된다', () => {
		const [group] = groupHistoryByDate(
			[
				item(1, at(2026, 9, 21, 15), 'b1'),
				item(2, at(2026, 9, 21, 15), 'b1'),
				item(3, at(2026, 9, 21, 14), 'b2'),
			],
			today,
		)

		expect(group?.stacks).toHaveLength(2)
		expect(group?.stacks[0]?.items.map(({ id }) => id)).toEqual([1, 2])
		expect(group?.stacks[1]?.items).toHaveLength(1)
	})

	// 🔴 batchKey가 없는 항목을 서로 묶으면 남남인 이미지가 한 묶음으로 보인다.
	it('batchKey가 없으면 서로 묶지 않는다', () => {
		const [group] = groupHistoryByDate(
			[item(1, at(2026, 9, 21, 15)), item(2, at(2026, 9, 21, 14))],
			today,
		)

		expect(group?.stacks).toHaveLength(2)
	})

	it('날짜가 갈리면 같은 batchKey여도 겹침이 갈린다', () => {
		const groups = groupHistoryByDate(
			[item(1, at(2026, 9, 21, 0), 'b1'), item(2, at(2026, 9, 20, 23), 'b1')],
			today,
		)

		expect(groups.map((group) => group.label)).toEqual(['오늘', '어제'])
		expect(groups.every((group) => group.stacks.length === 1)).toBe(true)
	})
})
