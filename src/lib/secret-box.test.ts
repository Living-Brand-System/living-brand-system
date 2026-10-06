import { describe, expect, it, vi } from 'vitest'

const secret = vi.hoisted(() => ({ value: 'secret-a' }))
vi.mock('@/env', () => ({
	env: {
		get PAYLOAD_SECRET() {
			return secret.value
		},
	},
}))

import { openSecret, sealSecret } from './secret-box'

describe('secret-box', () => {
	it('봉인한 값을 같은 secret으로 연다', () => {
		const sealed = sealSecret('figd_example')
		expect(sealed).not.toContain('figd_example')
		expect(openSecret(sealed)).toBe('figd_example')
	})

	it('같은 값도 매번 다른 암호문이 된다', () => {
		expect(sealSecret('same')).not.toBe(sealSecret('same'))
	})

	it('변조된 암호문은 열리지 않는다', () => {
		const [iv, tag, data] = sealSecret('figd_example').split('.')
		const tampered = [iv, tag, `${data?.slice(0, -2)}AA`].join('.')
		expect(openSecret(tampered)).toBeNull()
		expect(openSecret('not-sealed')).toBeNull()
	})

	it('다른 PAYLOAD_SECRET 환경(DB 사본)에서는 열리지 않는다', () => {
		const sealed = sealSecret('figd_example')
		secret.value = 'secret-b'
		expect(openSecret(sealed)).toBeNull()
		secret.value = 'secret-a'
	})
})
