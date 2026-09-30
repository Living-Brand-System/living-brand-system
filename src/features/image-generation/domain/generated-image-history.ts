import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'

/**
 * 좌측 갤러리가 그리는 생성 이미지 한 장.
 *
 * 🔑 복원 값은 **전원에게 열려 있다**(2026-09-28). 「worker에게 기능이 숨겨지면 안 된다」는
 *    결정에 따라 복원에 필요한 여섯 필드(scenario·scenarioName·inputPrompt·aspectRatio·
 *    imageSize·batchKey)의 manager 전용 field access를 걷어냈다.
 * 🔴 그래도 nullable인 이유는 둘이다 — 그 여섯 필드가 도입되기 전에 만들어진 행이 있고,
 *    복원에 안 쓰는 넷(effectivePrompt·model·createdBy·sourceImage)은 여전히 manager 전용이라
 *    권한 없는 사용자에게는 Payload가 빼고 내려준다. 조회는 계속 `overrideAccess: false`다.
 */
export interface GeneratedImageHistoryItem {
	id: number
	url: string
	createdAt: string
	/** 한 번의 생성 요청으로 함께 만들어진 이미지를 묶는 키. 권한이 없으면 null이다. */
	batchKey: string | null
	profileId: number | null
	profileName: string | null
	prompt: string | null
	aspectRatio: ImageAspectRatio | null
	imageSize: ImageOutputSize | null
}

/** 컨트롤러를 채울 수 있는 항목인가 — 프로파일과 프롬프트가 함께 있어야 복원이 성립한다. */
export function acceptsHistoryRestore(
	item: GeneratedImageHistoryItem,
): item is GeneratedImageHistoryItem & { profileId: number; prompt: string } {
	return typeof item.profileId === 'number' && typeof item.prompt === 'string'
}

/**
 * 한 번의 생성 요청으로 함께 나온 이미지들 — 화면에서는 겹친 한 장으로 그린다.
 * 🔑 `batchKey`가 없는 항목(권한이 닫혔거나 도입 이전 잔여)은 혼자 선다. 억지로 묶지 않는다.
 */
export type GeneratedImageHistoryStack = {
	key: string
	items: GeneratedImageHistoryItem[]
}

export type GeneratedImageHistoryGroup = {
	/** 로컬 시간 기준 날짜 키(YYYY-MM-DD). 라벨과 달리 날마다 유일하다. */
	key: string
	label: string
	stacks: GeneratedImageHistoryStack[]
}

function dayKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0')
	return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * 최신순 목록을 날짜 구간으로 자른다 — 519장을 한 덩어리로 훑을 수 없어서 넣은 구분이다.
 *
 * 🔑 입력 순서를 그대로 유지하고 같은 날짜가 이어질 때만 묶는다. 날짜별로 다시 모으면
 *    페이지가 이어 붙을 때 이미 그린 그룹에 항목이 끼어들어 격자가 흔들린다.
 * 🔴 경계는 UTC가 아니라 **보는 사람의 로컬 자정**이다 — 저장은 UTC지만 「오늘」은 화면의 말이다.
 */
export function groupHistoryByDate(
	items: readonly GeneratedImageHistoryItem[],
	today: Date = new Date(),
): GeneratedImageHistoryGroup[] {
	const todayKey = dayKey(today)
	const yesterday = new Date(today)
	yesterday.setDate(yesterday.getDate() - 1)
	const yesterdayKey = dayKey(yesterday)

	const groups: GeneratedImageHistoryGroup[] = []
	for (const item of items) {
		const date = new Date(item.createdAt)
		// 날짜를 못 읽는 항목은 앞 그룹에 붙인다 — 그림을 버리는 것보다 낫다.
		const key = Number.isNaN(date.getTime()) ? (groups.at(-1)?.key ?? todayKey) : dayKey(date)
		const last = groups.at(-1)
		if (last?.key === key) {
			pushIntoStack(last.stacks, item)
			continue
		}
		groups.push({
			stacks: [{ items: [item], key: stackKey(item) }],
			key,
			label: dateLabel(key, date, today, todayKey, yesterdayKey),
		})
	}
	return groups
}

function stackKey(item: GeneratedImageHistoryItem): string {
	// batchKey가 없으면 혼자 서야 하므로 절대 안 겹치는 키를 준다.
	return item.batchKey ?? `solo-${item.id}`
}

/**
 * 🔑 **이어진 것만** 묶는다. batchKey로 다시 모으면 페이지가 이어 붙을 때 이미 그린 겹침에
 *    항목이 끼어들어 격자가 흔들린다 — 날짜 묶기와 같은 이유다.
 */
function pushIntoStack(
	stacks: GeneratedImageHistoryStack[],
	item: GeneratedImageHistoryItem,
): void {
	const key = stackKey(item)
	const last = stacks.at(-1)
	if (item.batchKey !== null && last?.key === key) {
		last.items.push(item)
		return
	}
	stacks.push({ items: [item], key })
}

function dateLabel(
	key: string,
	date: Date,
	today: Date,
	todayKey: string,
	yesterdayKey: string,
): string {
	if (key === todayKey) return '오늘'
	if (key === yesterdayKey) return '어제'
	const [year, month, day] = key.split('-').map(Number)
	if (Number.isNaN(date.getTime()) || year === undefined) return key
	return year === today.getFullYear() ? `${month}월 ${day}일` : `${year}년 ${month}월 ${day}일`
}
