'use client'

import { useEffect } from 'react'
import { ImageGenerator } from '@/components/studio/image/image-generator'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { fetchImageStudioConfigs } from '@/features/image-generation/services/list-image-studio-configs.client'
import { useLazyResource } from '@/hooks/use-lazy-resource'

/** 실제 발행 프로파일만 사용한다. API의 인증·권한·모델 제한을 그대로 따른다. */
export function PlaygroundImageWorkspace() {
	const { data, status, load } = useLazyResource(fetchImageStudioConfigs)
	useEffect(() => {
		load()
	}, [load])
	const config = data?.[0]
	if (!config)
		return (
			<div className="grid min-h-96 place-items-center p-6">
				<div className="flex flex-col items-center gap-3">
					<Typography
						role={status === 'error' ? 'alert' : 'status'}
						size="sm"
						tone="muted"
					>
						{status === 'error'
							? '이미지 프로파일을 불러오지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해 주세요.'
							: status === 'ready'
								? '발행된 이미지 프로파일이 없습니다.'
								: '이미지 프로파일을 불러오는 중…'}
					</Typography>
					{status === 'error' && (
						<div className="flex gap-2">
							{/* Payload Admin은 별도 루트 레이아웃이므로 문서 단위로 이동한다. */}
							<Button variant="muted" asChild>
								<a href="/admin/login?redirect=%2Fstudio%2Fplayground">로그인</a>
							</Button>
							<Button variant="muted" onClick={load}>
								다시 시도
							</Button>
						</div>
					)}
				</div>
			</div>
		)
	return <ImageGenerator config={config} />
}
