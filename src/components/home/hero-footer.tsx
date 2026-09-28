import Image from 'next/image'
import Link from 'next/link'

import { Typography } from '@/components/ui/typography'
import { getGuidelineMetadata } from '@/features/guideline/services/get-guideline-metadata.service'
import { routes } from '@/lib/routes'
import { cn } from '@/lib/utils'

const FOOTER_LINK_GROUPS = [
	{
		label: 'Guideline',
		links: [{ href: routes.guideline, label: 'Overview' }],
	},
	{
		label: 'Studio',
		links: [
			{ href: routes.studio.template, label: 'Templates' },
			{ href: routes.studio.image, label: 'Image' },
			{ href: routes.studio.graphic, label: 'Graphic' },
			{ href: routes.studio.review, label: 'Review' },
			{ href: routes.studio.assets, label: 'Assets' },
		],
	},
] as const

export async function HeroFooter() {
	const { companyName, primaryDarkForegroundHex, primaryForegroundHex } =
		await getGuidelineMetadata()
	const logoClassName = cn(
		'brightness-0',
		primaryForegroundHex !== '#000000' && 'invert',
		primaryDarkForegroundHex === '#FFFFFF' ? 'dark:invert' : 'dark:invert-0',
	)

	return (
		<footer
			data-slot="hero-footer"
			className="relative z-10 overflow-hidden bg-primary text-primary-foreground"
		>
			<div className="grid gap-16 p-8 md:grid-cols-[minmax(0,1fr)_auto] md:p-12">
				<div className="flex flex-col items-start">
					<Image
						alt=""
						aria-hidden="true"
						className={cn('size-6', logoClassName)}
						height={24}
						src="/symbols/symbol_blk.svg"
						width={24}
					/>
					<Typography as="p" className="mt-4 opacity-60" size="xs">
						© {new Date().getFullYear()} {companyName}. All rights reserved.
					</Typography>
				</div>
				<nav aria-label="푸터 메뉴" className="grid grid-cols-2 gap-8 md:gap-16">
					{FOOTER_LINK_GROUPS.map((group) => (
						<div key={group.label}>
							<Typography as="p" size="xs" weight="semibold">
								{group.label}
							</Typography>
							<ul className="mt-4 space-y-2">
								{group.links.map((link) => (
									<li key={link.href}>
										<Link
											className="text-sm transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
											href={link.href}
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</nav>
			</div>

			<div
				aria-hidden="true"
				className="flex items-end justify-center gap-[3vw] px-6 md:px-10 pb-8"
			>
				{/*<Image
					alt=""
					className={`h-auto w-[18vw] min-w-28 shrink-0 ${logoClassName}`}
					height={715}
					src="/symbols/symbol_blk.svg"
					width={708}
				/>*/}
				<span className="whitespace-nowrap font-body text-[clamp(9rem,32vw,38rem)] leading-[0.68] font-semibold tracking-[-0.08em]">
					LBS
				</span>
			</div>
		</footer>
	)
}
