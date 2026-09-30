'use client'

import { useForm } from '@payloadcms/ui'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { ImageModelPreset } from '@/features/image-generation/domain/image-model'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import {
	deriveImageProfileController,
	getImageStudioControls,
	type ImageStudioConfig,
} from '@/features/image-generation/domain/image-studio-config'
import type { ImagePromptNormalizationResult } from '@/features/image-generation/services/generate-image.client'
import {
	requestAdminImageGeneration,
	requestImagePromptNormalization,
} from '@/features/image-generation/services/generate-image.client'

export function ImageProfileTestPanel() {
	const { getData, getDataByPath } = useForm()
	const [userPrompt, setUserPrompt] = useState('')
	const [normalizeUserPrompt, setNormalizeUserPrompt] = useState(true)
	const [result, setResult] = useState<ImagePromptNormalizationResult | null>(null)
	const [image, setImage] = useState<string | null>(null)
	const [error, setError] = useState('')
	const [isNormalizing, setIsNormalizing] = useState(false)
	const [isGenerating, setIsGenerating] = useState(false)

	async function normalizeCurrentForm(): Promise<ImagePromptNormalizationResult> {
		const next = await requestImagePromptNormalization({
			profilePrompt: getDataByPath('profilePrompt'),
			userPromptNormalization: normalizeUserPrompt
				? (getDataByPath('userPromptNormalization') ?? [])
				: [],
			userPrompt,
		})
		setResult(next)
		return next
	}

	async function handleNormalize() {
		if (!userPrompt.trim()) return
		setError('')
		setImage(null)
		setIsNormalizing(true)
		try {
			await normalizeCurrentForm()
		} catch (requestError) {
			setError(
				requestError instanceof Error ? requestError.message : '정규화에 실패했습니다.',
			)
		} finally {
			setIsNormalizing(false)
		}
	}

	async function handleGenerate() {
		if (!userPrompt.trim()) return
		setError('')
		setImage(null)
		setIsGenerating(true)
		try {
			const { finalPrompt } = await normalizeCurrentForm()
			const data = getData()
			const controller = deriveImageProfileController(
				data.imageModelPreset as ImageModelPreset,
				data.features,
				data.controllerRestrictions,
			)
			const { ratio, resolution } = getImageStudioControls({
				controller,
			} as ImageStudioConfig)
			if (!ratio.defaultValue || !resolution.defaultValue) {
				throw new Error('이미지 비율과 해상도 기본값을 확인하세요.')
			}
			const generated = await requestAdminImageGeneration({
				aspectRatio: ratio.defaultValue as ImageAspectRatio,
				count: 1,
				imageModelPreset: data.imageModelPreset,
				imageSize: resolution.defaultValue as ImageOutputSize,
				prompt: JSON.stringify(finalPrompt),
			})
			setImage(generated.images[0] ?? null)
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: '이미지 생성에 실패했습니다.',
			)
		} finally {
			setIsGenerating(false)
		}
	}

	const busy = isNormalizing || isGenerating

	return (
		<section className="mt-6 border-t border-border pt-6" aria-busy={busy}>
			<FieldGroup>
				<div>
					<FieldTitle>생성 테스트</FieldTitle>
					<FieldDescription>
						현재 폼 값을 사용합니다. 저장하지 않은 변경도 테스트할 수 있으며, 테스트
						결과는 저장되지 않습니다.
					</FieldDescription>
				</div>
				<Field>
					<FieldLabel htmlFor="image-profile-user-prompt">유저 인풋 프롬프트</FieldLabel>
					<Textarea
						id="image-profile-user-prompt"
						value={userPrompt}
						onChange={(event) => {
							setUserPrompt(event.currentTarget.value)
							setResult(null)
							setImage(null)
						}}
						maxLength={500}
						rows={4}
					/>
				</Field>
				<Field orientation="horizontal">
					<FieldLabel htmlFor="image-profile-normalize-user-prompt">
						유저 프롬프트 후보 정규화
					</FieldLabel>
					<Checkbox
						id="image-profile-normalize-user-prompt"
						checked={normalizeUserPrompt}
						onCheckedChange={(checked) => setNormalizeUserPrompt(checked === true)}
					/>
				</Field>
				<FieldDescription>
					켜면 유저 원문은 후보 선택에만 사용하고, 끄면 원문을 subject로 합성합니다.
				</FieldDescription>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={busy || !userPrompt.trim()}
						onClick={handleNormalize}
					>
						{isNormalizing && <Spinner data-icon="inline-start" />}
						{isNormalizing ? '정규화 중…' : '최종 JSON 확인'}
					</Button>
					<Button
						type="button"
						disabled={busy || !userPrompt.trim()}
						onClick={handleGenerate}
					>
						{isGenerating && <Spinner data-icon="inline-start" />}
						{isGenerating ? '생성 중…' : '이미지 생성'}
					</Button>
				</div>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				{result && (
					<div>
						<FieldTitle>최종 프롬프트 JSON</FieldTitle>
						<FieldDescription>
							같은 주제는 유저 프롬프트가 시스템 프롬프트를 덮어씁니다.
						</FieldDescription>
						<pre className="mt-2 overflow-x-auto rounded-md border bg-muted p-2 text-xs">
							{JSON.stringify(result.finalPrompt, null, 2)}
						</pre>
					</div>
				)}
				{image && (
					// biome-ignore lint/performance/noImgElement: 생성 직후 data URI 미리보기
					<img
						src={image}
						alt="이미지 프로파일 생성 테스트 결과"
						className="max-w-120 rounded-md border"
					/>
				)}
			</FieldGroup>
		</section>
	)
}
