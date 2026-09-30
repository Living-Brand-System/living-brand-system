import type { Block, Field } from 'payload'
import type { CardRatio } from './ratio'

export type DisplayType = 'static' | 'dynamic'
export type DisplayCategory =
	| 'identity'
	| 'typography'
	| 'layout'
	| 'color'
	| 'iconography'
	| 'media'
export type DisplaySizing = 'contain' | 'responsive'
export type DownloadFormat = 'svg'

/**
 * 디스플레이 하나의 정의 — 위젯 폴더의 `definition.ts`가 이것을 내보낸다(2026-09-08). 렌더 컴포넌트는 같은
 * 폴더의 `component.tsx` 기본 export이고 여기 없다: 이 정의는 payload.config가 Node에서 읽으므로 React·이미지
 * import가 섞이면 CLI(`payload migrate`·`generate:types`)가 깨진다(docs/11 §2).
 */
export interface DisplayDefinition<K extends string = string> {
	/** Payload `slug`이자 `blockType`. */
	id: K
	/** 정적(배경 이미지) 또는 다이나믹(위젯). */
	type: DisplayType
	category: DisplayCategory
	/** contain은 내부 콘텐츠 전체를 비례 맞춤, responsive는 위젯이 주어진 영역에서 재배치한다. */
	sizing: DisplaySizing
	/** 지정하면 카드의 저작 비율보다 우선한다. */
	ratio?: CardRatio
	/** 콘텐츠 안전 여백. 배경·액션·캡션에는 적용하지 않는다. */
	inset?: '10%'
	/** 지원 형식만 선언한다. 실행 콜백은 클라이언트 위젯이 제공한다. */
	downloads?: readonly DownloadFormat[]
	/** 중첩 테이블명 63자 방어용 짧은 별칭. 테이블 이름이라 한 번 정하면 바꾸지 않는다. */
	dbName: string
	/** admin 라벨. */
	name: string
	/** 사람이 읽는 정의. Payload 블록 선택기에는 슬롯이 없어 화면에 나오지 않는다. */
	description: string
	fields: Field[]
}

/** id 리터럴을 보존한다 — `DISPLAYS`에서 `DisplayId` 유니온을 뽑기 위해서다. */
export function defineDisplay<const K extends string>(
	definition: DisplayDefinition<K>,
): DisplayDefinition<K> {
	return definition
}

const pascal = (id: string) => id.charAt(0).toUpperCase() + id.slice(1)

/** 정의 하나를 Payload Block으로. slug·라벨·interfaceName은 정의에서 파생되고 `fields`만 그대로다. */
export function displaySchema(definition: DisplayDefinition): Block {
	return {
		slug: definition.id,
		dbName: definition.dbName,
		interfaceName: pascal(definition.id),
		labels: { singular: definition.name, plural: definition.name },
		fields: definition.fields,
	}
}
