import type { ReferenceImageResult } from '../../domain/reference-image/contract'

/** 첨부 하나마다 Worker를 사용하고 완료·실패·취소 시 해제한다. */
export function prepareReferenceImage(file: File, signal?: AbortSignal): Promise<Blob> {
	return new Promise((resolve, reject) => {
		signal?.throwIfAborted()
		const worker = new Worker(new URL('./reference-image.worker.ts', import.meta.url), {
			type: 'module',
		})
		const cleanup = () => {
			worker.terminate()
			signal?.removeEventListener('abort', abort)
		}
		const abort = () => {
			cleanup()
			reject(new DOMException('Aborted', 'AbortError'))
		}
		signal?.addEventListener('abort', abort, { once: true })
		worker.onmessage = ({ data }: MessageEvent<ReferenceImageResult>) => {
			cleanup()
			if (data instanceof Blob) resolve(data)
			else reject(new Error(data.error))
		}
		worker.onerror = () => {
			cleanup()
			reject(new Error('이미지를 변환하지 못했어요. 다른 이미지를 선택해 주세요.'))
		}
		worker.postMessage(file)
	})
}
