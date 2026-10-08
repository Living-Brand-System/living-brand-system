import { describe, expect, it } from 'vitest'
import { POST } from './route'

const post = (body: unknown) =>
	POST(
		new Request('https://lbs.example/api/ci-outline', {
			body: JSON.stringify(body),
			method: 'POST',
		}),
	)

describe('ci-outline route', () => {
	it('rejects requests over the input limits', async () => {
		expect((await post({ runs: [] })).status).toBe(400)
		expect((await post({ runs: Array(501).fill({ text: 'HD' }) })).status).toBe(400)
		expect((await post({ runs: [{ text: 'a'.repeat(2_001) }] })).status).toBe(400)
	})

	it('outlines runs within the limits', async () => {
		const response = await post({ runs: [{ text: 'HD' }, { text: '' }] })
		const data = await response.json()

		expect(response.status).toBe(200)
		expect(data.runs).toHaveLength(2)
		expect(data.runs[0].advance).toBeGreaterThan(0)
	})
})
