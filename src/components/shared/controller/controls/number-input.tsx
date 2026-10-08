'use client'

import type * as React from 'react'
import { useLayoutEffect, useRef } from 'react'
import { ControllerInput } from './input'

type ControllerNumberInputProps = Omit<
	React.ComponentProps<typeof ControllerInput>,
	'type' | 'value' | 'defaultValue' | 'onChange' | 'onBlur'
> & {
	/** 지금 값. 표시 형식을 정해 둔 쪽(소수 자리)은 문자열로 넘긴다. */
	value: number | string | null
	/** 떠날 때 한 번, 받아들일 수 있는 **바뀐** 값만 부른다. */
	onCommit: (value: number) => void
	/** 이 값을 쓸 수 있는가. 빈칸·숫자가 아닌 글자는 여기 오기 전에 걸러진다. */
	isValid?: (value: number) => boolean
	/** 쓸 수 없는 값이라 되돌렸을 때 — 이유를 화면에 남기는 쪽이 쓴다. */
	onInvalid?: () => void
}

/**
 * 숫자 하나를 고치는 칸. 🔴 입력 중간 상태(빈칸·`-`·`1.`)를 값으로 쓰지 않는다 — 키마다 반영하면
 * 빈칸이 0으로 덮인다(`Number('') === 0`). 떠날 때(blur·Enter) 한 번 반영하고, 쓸 수 없으면 직전 값으로 돌아간다.
 *
 * 🔑 반영한 직후에도 칸은 일단 직전 값으로 돌아간다. 받아들여져 바깥 값이 바뀌면 그리기 전에 새 값을
 *    채우고(layout effect), 거부되면 직전 값이 그대로 남는다 — 거부를 알리려고 `key`를 흔들 필요가 없다.
 */
export function ControllerNumberInput({
	value,
	onCommit,
	isValid,
	onInvalid,
	onKeyDown,
	...props
}: ControllerNumberInputProps) {
	const ref = useRef<HTMLInputElement>(null)
	const text = value === null ? '' : String(value)
	useLayoutEffect(() => {
		const input = ref.current
		if (input && input !== document.activeElement) input.value = text
	}, [text])
	return (
		<ControllerInput
			ref={ref}
			type="number"
			defaultValue={text}
			onBlur={(event) => {
				const raw = event.currentTarget.value
				const next = Number(raw)
				event.currentTarget.value = text
				if (raw === text) return
				if (!raw.trim() || !Number.isFinite(next) || (isValid && !isValid(next)))
					return onInvalid?.()
				if (value === null || next !== Number(value)) onCommit(next)
			}}
			onKeyDown={(event) => {
				if (event.key === 'Enter') event.currentTarget.blur()
				onKeyDown?.(event)
			}}
			{...props}
		/>
	)
}
