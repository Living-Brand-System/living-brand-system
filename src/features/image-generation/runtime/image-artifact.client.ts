'use client'

import type { CSSProperties } from 'react'
import type {
	BlobOriginalSource,
	OriginalArtifact,
	RasterArtifact,
} from '@/modules/studio-artifact/studio-artifact'
import { type ImageColorAdjustment, imageColorizeStyle } from './image-colorize'

export type ImageArtifacts = {
	raster: readonly RasterArtifact[]
	original: readonly OriginalArtifact<BlobOriginalSource>[]
}

/** 생성 결과를 변환용 Raster와 원본 전달용 Original Artifact로 분리한다. */
export function createImageArtifacts({
	images,
	color,
}: {
	images: readonly string[]
	color: ImageColorAdjustment | null | undefined
}): ImageArtifacts {
	return {
		raster: images.map((src) => ({ kind: 'raster', source: createRasterSource(src, color) })),
		original: images.map((src) => ({
			kind: 'original',
			source: {
				load: () => loadOriginal(src),
				extension: (blob) => imageExtension(blob.type, src),
				mimeType: (blob) => blob.type || `image/${imageExtension(blob.type, src)}`,
			},
		})),
	}
}

function createRasterSource(
	src: string,
	color: ImageColorAdjustment | null | undefined,
): RasterArtifact['source'] {
	return {
		withSurface: async (_options, consume) => {
			const { naturalHeight, naturalWidth } = await loadImage(src)
			const holder = document.createElement('div')
			holder.style.cssText = 'position:fixed;left:-99999px;top:0'
			const stage = createImageStage(src, color, naturalWidth, naturalHeight)
			holder.appendChild(stage)
			document.body.appendChild(holder)
			try {
				return await consume({
					kind: 'element',
					element: stage,
					width: naturalWidth,
					height: naturalHeight,
				})
			} finally {
				holder.remove()
			}
		},
	}
}

async function loadOriginal(src: string): Promise<Blob> {
	const response = await fetch(src)
	if (!response.ok) throw new Error('원본 이미지를 불러오지 못했습니다.')
	return response.blob()
}

function imageExtension(mimeType: string, src: string): string {
	if (mimeType.startsWith('image/')) {
		return mimeType.slice('image/'.length).replace('jpeg', 'jpg').replace('svg+xml', 'svg')
	}
	return new URL(src, window.location.href).pathname.split('.').pop() || 'png'
}

function createImageStage(
	src: string,
	color: ImageColorAdjustment | null | undefined,
	width: number,
	height: number,
): HTMLElement {
	if (!color) {
		const image = document.createElement('img')
		image.id = '__stage'
		image.src = src
		image.width = width
		image.height = height
		return image
	}
	const { base, overlay } = imageColorizeStyle(src, color)
	const stage = document.createElement('div')
	stage.id = '__stage'
	Object.assign(stage.style, base, {
		position: 'relative',
		width: `${width}px`,
		height: `${height}px`,
	} satisfies CSSProperties)
	const layer = document.createElement('div')
	Object.assign(layer.style, overlay, {
		position: 'absolute',
		inset: '0',
	} satisfies CSSProperties)
	stage.appendChild(layer)
	return stage
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.addEventListener('load', () => resolve(image), { once: true })
		image.addEventListener(
			'error',
			() => reject(new Error('저장할 이미지를 불러오지 못했습니다.')),
			{ once: true },
		)
		image.src = src
	})
}
