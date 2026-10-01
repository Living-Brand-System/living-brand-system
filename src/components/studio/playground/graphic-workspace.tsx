'use client'
import { useEffect } from 'react'
import { GraphicGenerator } from '@/components/studio/graphic/graphic-generator'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { fetchCanvasStudioConfigs } from '@/features/graphic-generation/services/list-canvas-studio-configs.client'
import { useLazyResource } from '@/hooks/use-lazy-resource'

const loadGraphics = () => fetchCanvasStudioConfigs('graphic')
export function PlaygroundGraphicWorkspace() {
	const { data, status, load } = useLazyResource(loadGraphics)
	useEffect(() => {
		load()
	}, [load])
	const config = data?.[0]
	return config ? (
		<GraphicGenerator config={config} />
	) : (
		<div className="grid min-h-96 place-items-center p-6">
			<div className="flex flex-col gap-3">
				<Typography role={status === 'error' ? 'alert' : 'status'}>
					{status === 'error'
						? '그래픽 프로파일을 불러오지 못했습니다.'
						: status === 'ready'
							? '발행된 그래픽 프로파일이 없습니다.'
							: '그래픽 프로파일을 불러오는 중…'}
				</Typography>
				{status === 'error' && <Button onClick={load}>다시 시도</Button>}
			</div>
		</div>
	)
}
