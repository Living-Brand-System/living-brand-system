import config from '@payload-config'
import { getPayload } from 'payload'
import {
	MONO_COLORS,
	SYMBOL_CONTOURS,
	WORDMARK_COLOR_NAME,
} from '../cards/displays/dynamics/ci-lockup/rules'

/** 이 위젯이 쓰는 색 이름 전부. 조회와 타입이 같은 목록을 쓰게 한 곳에 모은다. */
const COLOR_NAMES = [
	WORDMARK_COLOR_NAME,
	...MONO_COLORS,
	...SYMBOL_CONTOURS.map((c) => c.colorName),
]

export async function findCiLockupColors(): Promise<Record<string, string>> {
	try {
		const payload = await getPayload({ config })
		const { docs } = await payload.find({
			collection: 'brand-colors',
			where: { name: { in: COLOR_NAMES } },
			depth: 0,
			limit: 20,
			overrideAccess: true,
		})
		return Object.fromEntries(docs.flatMap((d) => (d.name && d.hex ? [[d.name, d.hex]] : [])))
	} catch {
		return {}
	}
}
