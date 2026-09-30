import type { VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'
import { typographyVariants } from './typography-variants'

type TypographyElement = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'small' | 'span'

type TypographyProps = React.HTMLAttributes<HTMLElement> &
	VariantProps<typeof typographyVariants> & {
		as?: TypographyElement
	}

function Typography({
	as = 'p',
	className,
	family = 'body',
	size = 'base',
	tone = 'inherit',
	weight = 'normal',
	...props
}: TypographyProps) {
	const Comp: React.ElementType = as

	return (
		<Comp
			data-slot="typography"
			data-size={size}
			className={cn(typographyVariants({ family, size, tone, weight }), className)}
			{...props}
		/>
	)
}

export { Typography }
