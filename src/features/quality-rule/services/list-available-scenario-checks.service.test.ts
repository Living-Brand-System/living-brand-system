import type { PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	listAvailableScenarioChecks,
	validateCheckScenarioKey,
	validateCheckScenarioKeys,
} from './list-available-scenario-checks.service'

const find = vi.fn()
vi.mock('../repositories/rules.payload.repository', () => ({
	findPublishedRules: (req: PayloadRequest) => find(req).then((r: { docs: unknown[] }) => r.docs),
}))

function req(user?: unknown): PayloadRequest {
	return { user } as never
}

const rule = (overrides: Record<string, unknown> = {}) => ({
	key: 'check.key',
	title: 'Check title',
	...overrides,
})

describe('listAvailableScenarioChecks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('published Rule을 조회해 표시 이름을 조립하고 제목 순으로 정렬한다', async () => {
		const user = { role: 'manager' }
		find.mockResolvedValue({
			docs: [
				rule({ key: 'type.scale', title: 'Type Scale' }),
				rule({
					executor: 'deterministic',
					key: 'color.palette',
					title: 'Color',
					titleKo: '컬러',
				}),
				rule({ key: 'logo.clear', titleKo: '로고' }),
			],
		})

		await expect(listAvailableScenarioChecks(req(user))).resolves.toEqual([
			{ executor: undefined, key: 'logo.clear', title: '로고' },
			{ executor: 'deterministic', key: 'color.palette', title: '컬러' },
			{ executor: undefined, key: 'type.scale', title: 'Type Scale' },
		])
		expect(find).toHaveBeenCalledWith(req(user))
	})
})

describe('CheckScenario validation', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('영속 key 형식을 검증한다', () => {
		expect(validateCheckScenarioKey('quick-check')).toBe(true)
		expect(validateCheckScenarioKey('Quick Check')).toBe(
			'Key는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.',
		)
	})

	it('선택 형식과 중복을 먼저 확인하고 published Rule 존재 여부를 조회한다', async () => {
		find.mockResolvedValue({ docs: [rule({ key: 'color.palette' })] })

		await expect(validateCheckScenarioKeys([], req())).resolves.toBe(
			'Check를 1개 이상 포함하세요.',
		)
		await expect(validateCheckScenarioKeys([''], req())).resolves.toBe(
			'Check key는 비어 있지 않은 문자열이어야 합니다.',
		)
		await expect(
			validateCheckScenarioKeys(['color.palette', 'color.palette'], req()),
		).resolves.toBe('중복된 Check가 있습니다.')
		expect(find).not.toHaveBeenCalled()

		await expect(validateCheckScenarioKeys(['color.palette'], req())).resolves.toBe(true)
		await expect(validateCheckScenarioKeys(['missing'], req())).resolves.toBe(
			'발행된 검수 규칙에 없는 Check입니다: missing',
		)
	})
})
