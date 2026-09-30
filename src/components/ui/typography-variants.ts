import { cva } from 'class-variance-authority'

export const typographyVariants = cva('', {
	variants: {
		family: {
			body: 'font-body',
			title: 'font-title',
		},
		size: {
			xs: 'text-xs',
			sm: 'text-sm',
			base: 'text-base',
			xl: 'text-xl',
			'2xl': 'text-2xl',
			'5xl': 'text-5xl',
			'6xl': 'text-6xl',
		},
		tone: {
			inherit: null,
			muted: 'text-muted-foreground',
			destructive: 'text-destructive',
		},
		weight: {
			normal: 'font-normal',
			medium: 'font-medium',
			semibold: 'font-semibold',
			bold: 'font-bold',
		},
	},
	defaultVariants: {
		family: 'body',
		size: 'base',
		tone: 'inherit',
		weight: 'normal',
	},
})
