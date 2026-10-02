'use client'
import { useState } from 'react'
import { Typography } from '@/components/ui/typography'
import { useShellLocked } from '@/hooks/use-shell-lock'
import { PlaygroundGraphicWorkspace } from './graphic-workspace'
import { PlaygroundImageWorkspace } from './image-workspace'
import { PlaygroundTemplateWorkspace } from './template-workspace'

const EXAMPLES = {
	image: { name: 'Image Generator' },
	graphic: { name: 'Graphic Generator' },
	template: { name: 'Template Generator' },
} as const
type Example = keyof typeof EXAMPLES
export function StudioLayoutPlayground({
	initialExample = 'graphic',
}: {
	initialExample?: Example
}) {
	const [example, setExample] = useState<Example>(initialExample)
	const [boundaries, setBoundaries] = useState(false)
	const selected = EXAMPLES[example]
	const shellLocked = useShellLocked()
	return (
		<main
			data-slot="studio-layout-playground"
			data-boundaries={boundaries}
			className="group/playground grid min-h-dvh grid-rows-[auto_minmax(0,1fr)] lg:h-dvh lg:overflow-hidden data-[boundaries=true]:[&_[data-slot^=studio-layout-]]:outline-1 data-[boundaries=true]:[&_[data-slot^=studio-layout-]]:outline-dashed data-[boundaries=true]:[&_[data-slot^=studio-layout-]]:outline-info"
		>
			<header
				data-slot="studio-layout-header"
				inert={shellLocked}
				className="flex min-h-15 flex-wrap items-center gap-4 border-b border-border px-4 py-2"
			>
				<div className="mr-auto">
					<Typography as="h1" size="sm" weight="medium">
						{selected.name}
					</Typography>
					<Typography size="xs" tone="muted">
						실제 편집 및 출력
					</Typography>
				</div>
				<label className="flex items-center gap-2 text-sm">
					화면
					<select
						value={example}
						onChange={(event) => {
							setExample(event.target.value as Example)
						}}
						className="rounded-md bg-muted p-2 focus-visible:outline-2 focus-visible:outline-ring"
					>
						{Object.entries(EXAMPLES).map(([value, { name }]) => (
							<option key={value} value={value}>
								{name}
							</option>
						))}
					</select>
				</label>
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={boundaries}
						onChange={(event) => setBoundaries(event.target.checked)}
						className="accent-primary"
					/>
					경계 표시
				</label>
			</header>
			{example === 'image' ? (
				<PlaygroundImageWorkspace />
			) : example === 'template' ? (
				<PlaygroundTemplateWorkspace />
			) : (
				<PlaygroundGraphicWorkspace />
			)}
		</main>
	)
}
