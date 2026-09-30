import type { ComponentProps } from 'react'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import styles from './caption.module.css'

export type GuidelineCaption = { title?: string; description?: string } & (
	| { type?: 'basic' }
	| { type: 'list'; items: readonly { title?: string; description: string }[] }
	| {
			type: 'specification'
			groups: readonly {
				title?: string
				items: readonly { label: string; value: string }[]
			}[]
	  }
)

type CaptionProps = GuidelineCaption & Pick<ComponentProps<'figcaption'>, 'className'>

/** 내용과 내부 스타일은 캡션이, 배치와 고정은 컨테이너가 소유합니다. */
export function GuidelineCardCaption(props: CaptionProps) {
	const { title, description, className, type = 'basic' } = props
	const hasContent =
		props.type === 'list'
			? props.items.length > 0
			: props.type === 'specification'
				? props.groups.some((group) => group.title || group.items.length)
				: false
	if (!title && !description && !hasContent) return null
	return (
		<figcaption
			data-slot="guideline-card-caption"
			data-type={type}
			className={cn(styles.caption, className)}
		>
			{(title || description) && (
				<div data-slot="caption-heading">
					{title && <Typography className={styles.title}>{title}</Typography>}
					{description && (
						<Typography className={styles.description}>{description}</Typography>
					)}
				</div>
			)}
			{props.type === 'list' && props.items.length > 0 && (
				<ul className={styles.list}>
					{props.items.map((item, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: 상태 없는 문서 항목이며 중복 문구도 허용합니다.
						<li key={`${index}-${item.title ?? ''}`}>
							{item.title && (
								<Typography className={styles.title}>{item.title}</Typography>
							)}
							<Typography className={styles.description}>
								{item.description}
							</Typography>
						</li>
					))}
				</ul>
			)}
			{props.type === 'specification' &&
				props.groups.map((group, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: 상태 없는 문서 그룹이며 이름 생략과 중복을 허용합니다.
					<div key={`${index}-${group.title ?? ''}`} className={styles.specification}>
						{group.title && (
							<Typography className={styles.title}>{group.title}</Typography>
						)}
						{group.items.length > 0 && (
							<dl>
								{group.items.map((item, row) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: 상태 없는 명세 행이며 중복 항목명을 허용합니다.
									<div key={`${row}-${item.label}`} className={styles.row}>
										<dt className={styles.title}>{item.label}</dt>
										<dd className={styles.description}>{item.value}</dd>
									</div>
								))}
							</dl>
						)}
					</div>
				))}
		</figcaption>
	)
}
