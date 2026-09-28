import { describe, expect, it } from 'vitest'
import { GeneratedImages } from './GeneratedImages'

describe('GeneratedImages collection', () => {
	it('keeps generation metadata private while exposing only published files publicly', async () => {
		const read = GeneratedImages.access?.read
		expect(typeof read).toBe('function')
		expect(
			await read?.({
				req: { user: { email: 'manager@example.com', role: 'manager' } },
			} as never),
		).toBe(true)
		expect(await read?.({ req: { user: null } } as never)).toEqual({
			_status: { equals: 'published' },
		})

		const readOf = (name: string) => {
			const field = GeneratedImages.fields.find((f) => 'name' in f && f.name === name)
			expect(field, `${name} 필드가 없습니다.`).toBeDefined()
			return field && 'access' in field ? field.access?.read : undefined
		}

		// 🔑 복원에 쓰이는 여섯 필드는 전원에게 열려 있다 — worker에게 기능이 숨겨지면 안 된다
		//    (2026-09-28 결정). field access 자체를 두지 않는 것이 「열림」이다.
		for (const name of [
			'scenario',
			'scenarioName',
			'inputPrompt',
			'aspectRatio',
			'imageSize',
			'batchKey',
		]) {
			expect(readOf(name), `${name}은 전원에게 열려 있어야 합니다.`).toBeUndefined()
		}

		// 복원에 안 쓰이는 넷은 manager 전용으로 남는다.
		for (const name of ['effectivePrompt', 'model', 'createdBy', 'sourceImage']) {
			const metadataRead = readOf(name)
			expect(typeof metadataRead, `${name}은 manager 전용이어야 합니다.`).toBe('function')
			expect(await metadataRead?.({ req: { user: { role: 'worker' } } } as never)).toBe(false)
			expect(await metadataRead?.({ req: { user: { role: 'manager' } } } as never)).toBe(true)
		}

		const remove = GeneratedImages.access?.delete
		expect(
			await remove?.({
				req: { user: { email: 'manager@example.com', role: 'manager' } },
			} as never),
		).toEqual({ _status: { equals: 'draft' } })
		expect(await remove?.({ req: { user: { role: 'worker' } } } as never)).toBe(false)
	})

	it('참조 원본을 매니저 전용 관계 필드로 보관한다', async () => {
		const sourceImage = GeneratedImages.fields.find(
			(field) => 'name' in field && field.name === 'sourceImage',
		)
		expect(sourceImage).toBeDefined()
		expect(sourceImage && 'relationTo' in sourceImage ? sourceImage.relationTo : null).toBe(
			'generated-images',
		)
		// 참조 없이 만든 이미지가 다수이므로 필수가 아니어야 한다.
		expect(sourceImage && 'required' in sourceImage ? sourceImage.required : false).toBeFalsy()

		const read = sourceImage && 'access' in sourceImage ? sourceImage.access?.read : undefined
		expect(await read?.({ req: { user: { role: 'worker' } } } as never)).toBe(false)
		expect(await read?.({ req: { user: { role: 'manager' } } } as never)).toBe(true)
	})
})
