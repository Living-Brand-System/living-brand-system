import Image from 'next/image'
import { LOGO_BACKGROUND_DIVIDER } from '@/features/guideline/cards/displays/dynamics/surface'
import type { PaletteGroup } from '@/features/guideline/domain/contract/palette'
import { getContrastingForeground } from '@/lib/color'
import { GuidelineCardActions, type GuidelineDisplayActions } from './card-actions'
import { GuidelineDisplayFrame } from './grid'

export function GuidelineLogoOnBackgroundDisplay({
	groups,
	logos,
	actions,
}: {
	groups: readonly PaletteGroup[]
	actions?: GuidelineDisplayActions
	logos: { default: string | null; white: string | null; mono: string | null }
}) {
	const rows = groups.reduce((sum, group) => sum + group.colors.length, 0)
	if (!rows) return null
	return (
		<GuidelineDisplayFrame style={{ aspectRatio: `48 / ${9 * rows}` }}>
			<div className="flex h-full flex-col">
				{groups.flatMap((group) =>
					group.colors.map((color) => {
						const usage = color.logoUsage
						return (
							<div
								key={`${group.id}-${color.id}`}
								className={`grid min-h-0 flex-1 grid-cols-3 divide-x ${LOGO_BACKGROUND_DIVIDER}`}
								style={{
									backgroundColor: color.value,
									color: getContrastingForeground(color.value),
								}}
							>
								{(
									[
										{
											key: 'default',
											label: '기본형',
											allowed: usage?.fullColor,
										},
										{
											key: 'white',
											label: 'WHITE 워드마크',
											allowed: usage?.whiteWordmark,
										},
										{
											key: 'mono',
											label: '단색형',
											allowed: usage?.mono ? true : null,
										},
									] as const
								).map(({ key, label, allowed }) => {
									const src = logos[key]
									return (
										<div
											key={key}
											className="relative flex min-h-0 min-w-0 items-center justify-center"
										>
											{allowed === false ? (
												<span className="sr-only">
													{color.label} · {label} 사용 금지
												</span>
											) : allowed == null ? (
												<span className="text-xs">규정 미등록</span>
											) : !src ? (
												<span className="text-xs">로고 미등록</span>
											) : key === 'mono' ? (
												<div
													role="img"
													aria-label={`${color.label} 배경 · ${usage?.mono === 'white' ? '흰색' : '검정'} 단색 로고`}
													className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2"
													style={{
														backgroundColor:
															usage?.mono === 'white'
																? '#FFFFFF'
																: '#000000',
														maskImage: `url(${src})`,
														maskSize: 'contain',
														maskRepeat: 'no-repeat',
														maskPosition: 'center',
													}}
												/>
											) : (
												<Image
													unoptimized
													src={src}
													width={160}
													height={48}
													alt={`${color.label} 배경 · ${label}`}
													className="absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
												/>
											)}
										</div>
									)
								})}
							</div>
						)
					}),
				)}
			</div>
			<GuidelineCardActions {...actions} />
		</GuidelineDisplayFrame>
	)
}
