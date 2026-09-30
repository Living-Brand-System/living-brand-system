import config from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import { isValidHex } from '@/lib/color'
import type { BrandColor } from '@/payload-types'
import type { PaletteCatalog, PaletteGroup } from '../domain/contract/palette'

/** 신규 family 키를 우선하며, 아직 분류하지 않은 기존 그룹명만 호환합니다. */
export async function findPaletteCatalog(context?: {
	payload: PayloadRequest['payload']
	user: PayloadRequest['user']
	req?: PayloadRequest
	locale?: 'ko' | 'en'
}): Promise<PaletteCatalog> {
	const payload = context?.payload ?? (await getPayload({ config }))
	const { docs } = await payload.find({
		collection: 'brand-color-groups',
		...(context
			? {
					overrideAccess: false,
					user: context.user,
					req: context.req,
					locale: context.locale ?? 'ko',
					fallbackLocale: 'en' as const,
					draft: false,
				}
			: {}),
		where: {
			and: [
				{ _status: { equals: 'published' } },
				{
					or: [
						{ family: { exists: true } },
						{ name: { in: ['Primary Color', 'Secondary Color', 'Mono Color'] } },
					],
				},
			],
		},
		depth: 1,
		pagination: false,
	})
	const groups: (PaletteGroup & { family?: string | null })[] = docs
		.map((group) => ({
			id: String(group.id),
			family: group.family,
			name: group.name,
			colors: (group.colors ?? [])
				.filter(
					(color): color is BrandColor =>
						typeof color === 'object' &&
						color !== null &&
						color._status === 'published' &&
						isValidHex(color.hex),
				)
				.map((color) => ({
					id: String(color.id),
					label: color.name,
					value: `#${color.hex.replace(/^#/, '')}`,
					cmyk: color.cmyk,
					pantone: color.pantone,
					logoUsage: {
						fullColor: color.allowsFullColorLogo ?? null,
						whiteWordmark: color.allowsWhiteWordmark ?? null,
						mono: color.monoLogoFill ?? null,
					},
				})),
		}))
		.filter((group) => group.colors.length)
	// 기존 DB 이름은 이 어댑터에서만 해석합니다. 새 CMS는 family 키로 연결합니다.
	const catalog: PaletteCatalog = {}
	for (const [family, legacyName, name] of [
		['primary', 'Primary Color', 'Primary'],
		['supportive', 'Secondary Color', 'Supportive'],
		['monotone', 'Mono Color', 'Monotone'],
	] as const) {
		const group =
			groups.find((group) => group.family === family) ??
			groups.find((group) => !group.family && group.name === legacyName)
		if (group) {
			// Figma 167:11710: 밝은 초록·밝은 파랑 다음에 어두운 초록·어두운 파랑.
			const order = ['HD LIGHT GREEN', 'HD LIGHT BLUE', 'HD DEEP GREEN', 'HD DEEP BLUE']
			const rank = (label: string) => {
				const index = order.indexOf(label)
				return index < 0 ? order.length : index
			}
			catalog[family] = {
				...group,
				name,
				colors:
					family === 'supportive' && !group.family
						? [...group.colors].sort((a, b) => rank(a.label) - rank(b.label))
						: group.colors,
			}
		}
	}
	return catalog
}
