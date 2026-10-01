'use client'

import { useEffect, useState } from 'react'
import { TemplateGenerator } from '@/components/studio/template/template-generator'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { fetchCreateNavigation } from '@/features/template-customization/services/get-create-navigation.client'
import { fetchTemplateStudio } from '@/features/template-customization/services/get-template-studio.client'
import type { GetTemplateStudioOutput } from '@/features/template-customization/services/get-template-studio.service'
import { useLazyResource } from '@/hooks/use-lazy-resource'

/** 목록은 공개 카탈로그, 상세는 실제 Studio와 같은 인증된 발행 계약을 사용한다. */
export function PlaygroundTemplateWorkspace() {
	const { data, status, load } = useLazyResource(fetchCreateNavigation)
	const [selected, setSelected] = useState<string | null>(null)
	const [attempt, setAttempt] = useState(0)
	const [revision, setRevision] = useState(0)
	const [loaded, setLoaded] = useState<{ slug: string; studio: GetTemplateStudioOutput } | null>(
		null,
	)
	const [failure, setFailure] = useState<{ slug: string; message: string } | null>(null)
	const slug = selected ?? data?.flatMap((category) => category.templates)[0]?.slug
	useEffect(() => {
		load()
	}, [load])
	// biome-ignore lint/correctness/useExhaustiveDependencies(attempt): 동일 slug의 명시적 재시도 트리거다.
	useEffect(() => {
		if (!slug) return
		const controller = new AbortController()
		setFailure(null)
		void fetchTemplateStudio(slug, controller.signal).then(
			(studio) => {
				if (!controller.signal.aborted) setLoaded({ slug, studio })
			},
			(error) => {
				if (!controller.signal.aborted)
					setFailure({
						slug,
						message:
							error instanceof Error
								? error.message
								: '템플릿을 불러오지 못했습니다.',
					})
			},
		)
		return () => controller.abort()
	}, [slug, attempt])
	const studio = loaded && loaded.slug === slug ? loaded.studio : null
	const error =
		failure?.slug === slug
			? failure?.message
			: status === 'error'
				? '템플릿 목록을 불러오지 못했습니다.'
				: null
	const change = (next: string) => {
		setSelected(next)
		setRevision((current) => current + 1)
	}
	if (!studio || error)
		return (
			<div className="grid min-h-96 place-items-center p-6">
				<div className="flex max-w-sm flex-col items-center gap-3">
					<Typography role={error ? 'alert' : 'status'} size="sm" tone="muted">
						{error ??
							(status === 'ready' && !slug
								? '발행된 템플릿이 없습니다.'
								: '템플릿을 불러오는 중…')}
					</Typography>
					{error && (
						<>
							<Button
								variant="muted"
								onClick={() => {
									load()
									setAttempt((current) => current + 1)
								}}
							>
								다시 시도
							</Button>
							{/* Payload Admin은 별도 루트 레이아웃이므로 문서 단위로 이동한다. */}
							<a
								href="/admin/login?redirect=%2Fstudio%2Fplayground%3Fview%3Dtemplate"
								className="text-sm underline"
							>
								로그인
							</a>
						</>
					)}
				</div>
			</div>
		)
	return (
		<TemplateGenerator
			key={`${studio.config.id}:${revision}`}
			config={studio.config}
			template={studio.template}
			highlightColor={studio.highlightColor}
			categoryTitle={
				data?.find((category) => category.templates.some((item) => item.slug === slug))
					?.title ?? null
			}
			onTemplateChange={change}
		/>
	)
}
