/**
 * 텍스트 칸의 입력 형식 — 형식마다의 입출력 계약은 이 표 한 곳이 소유한다(2026-10-14).
 *
 * 🔑 형식은 kind가 아니다. 값은 형식과 상관없이 늘 문자열로 저장·전송된다(JSON Schema의
 *    `type: string` + `format`과 같은 구분). 형식은 그 문자열을 어떻게 받고(입력) 캔버스에
 *    무엇으로 찍을지(출력)만 정한다. 값을 문자열이 아닌 채로 계산해야 하는 축이 생기면 그때 kind다.
 * 🔴 저장은 원값, 표기는 출력 때만 — 날짜는 `2026-10-14`로 저장하고 캔버스에 쓰는 순간에만
 *    `October 14 2026`으로 바꾼다. 표기를 바꿔도 저장된 데이터는 손대지 않는다.
 */
export const TEXT_FORMAT_IDS = ['free', 'number', 'email', 'date'] as const
export type TextFormatId = (typeof TEXT_FORMAT_IDS)[number]

type TextFormat = {
	label: string
	/** 브라우저 입력 종류 — `<input type>`에 그대로 들어간다. */
	inputType: 'text' | 'number' | 'email' | 'date'
	/** 여러 줄을 받을 수 있는가 — 자유 형식만 받는다(최대 줄 1이면 그래도 한 줄). */
	multiline: boolean
	/** 입력 계약: 받아들일 수 있는 값인가. 빈 값은 「아직 안 씀」이라 늘 받는다. */
	accepts: (raw: string) => boolean
	/** 출력 계약: 캔버스에 찍을 글자. */
	toText: (raw: string) => string
	/** 모델에게 보여 줄 입력 예 — 형식 이름만으로 값 모양이 정해지지 않을 때만. */
	example?: string
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
// 🔴 UTC로 읽는다 — 시간대를 두면 미국 서부 기기에서 2026-10-14가 「October 13」이 된다(실측).
const MONTH_DAY_YEAR = new Intl.DateTimeFormat('en-US', {
	month: 'long',
	day: 'numeric',
	year: 'numeric',
	timeZone: 'UTC',
})

/** 달력에 실제로 있는 날짜인가 — `Date`는 2026-02-30을 3월 2일로 넘겨 버리므로 되읽어 비교한다. */
function isRealIsoDate(raw: string) {
	const match = ISO_DATE.exec(raw)
	if (!match) return false
	const date = new Date(`${raw}T00:00:00Z`)
	return (
		date.getUTCFullYear() === Number(match[1]) &&
		date.getUTCMonth() + 1 === Number(match[2]) &&
		date.getUTCDate() === Number(match[3])
	)
}

const same = (raw: string) => raw

export const TEXT_FORMATS = {
	free: { label: '자유', inputType: 'text', multiline: true, accepts: () => true, toText: same },
	number: {
		label: '숫자',
		inputType: 'number',
		multiline: false,
		accepts: (raw) => raw === '' || /^-?\d+(\.\d+)?$/.test(raw),
		// 입력 그대로 찍는다(사용자 결정 2026-10-14) — 천 단위 구분이 필요하면 여기 한 줄이다.
		toText: same,
	},
	email: {
		label: '이메일',
		inputType: 'email',
		multiline: false,
		accepts: (raw) => raw === '' || /^\S+@\S+\.\S+$/.test(raw),
		toText: same,
	},
	date: {
		label: '날짜',
		inputType: 'date',
		multiline: false,
		accepts: (raw) => raw === '' || isRealIsoDate(raw),
		// ISO가 아닌 값(Figma 기본 문구 「December 2025」 등)은 그대로 둔다 — 저장된 문구를 바꾸지 않는다.
		toText: (raw) =>
			isRealIsoDate(raw)
				? MONTH_DAY_YEAR.formatToParts(new Date(`${raw}T00:00:00Z`))
						.filter((part) => part.type !== 'literal')
						.map((part) => part.value)
						.join(' ')
				: raw,
		example: '2026-10-14',
	},
} as const satisfies Record<TextFormatId, TextFormat>

/** 형식 선택지(값·라벨) — 어드민 레이어 편집기와 Manager mode 폼이 같이 쓴다. */
export const TEXT_FORMAT_OPTIONS = TEXT_FORMAT_IDS.map((value) => ({
	value,
	label: TEXT_FORMATS[value].label,
}))

/** 저장값이 비었으면 자유 형식이다 — 저장소는 기본값(`free`)을 적지 않는다. */
export function textFormatOf(format: TextFormatId | undefined): TextFormat {
	return TEXT_FORMATS[format ?? 'free']
}
