'use client'

import { DataBase } from '@carbon/icons-react'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * 열린 탭과 고르는 항목은 주소가 갖는다 — 새로고침하면 그대로 열리고, 다른 페이지로 가면 닫힌다
 * (사용자 2026-10-13).
 */
const EDIT_PARAM = 'edit'
const ITEM_PARAM = 'edit-item'

/**
 * 화면 어디서든 데이터 편집 모달의 한 탭을 연다 — 그 탭을 가진 모달이 화면에 있으면 열린다(파운데이션 모달처럼
 * 여러 경로에서 여는 공용 모달). 서버 왕복 없이 주소만 바꾼다.
 */
export function openDataEditorTab(tabId: string): void {
	const next = new URLSearchParams(window.location.search)
	next.set(EDIT_PARAM, tabId)
	next.delete(ITEM_PARAM)
	window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`)
}

export type DataEditorNavigation = {
	/** 다른 탭으로 옮긴다 — 목록의 「생성」 → 생성 탭, 행의 「수정」 → 수정 탭 + 그 항목. */
	goTo: (tabId: string, itemId?: string | number) => void
	/** 지금 고르고 있는 항목(수정 탭). */
	itemId: string | null
}

export type DataEditorTab = {
	id: string
	label: string
	render: (navigation: DataEditorNavigation) => ReactNode
}

type DataEditorProps = {
	/** 무엇의 데이터인가 — 「템플릿」. 모달 제목과 버튼 이름에 들어간다. */
	subject: string
	tabs: readonly [DataEditorTab, ...DataEditorTab[]]
	/**
	 * 여는 버튼을 화면이 직접 그릴 때(템플릿 편집 화면의 레일 「Manager mode (CMS Style)」). 없으면 아이콘
	 * 버튼 하나를 그린다(템플릿 첫 화면 띠).
	 */
	trigger?: (open: () => void) => ReactNode
	/** 버튼으로 열 때 처음 보일 탭과 항목 — 템플릿 편집 화면은 지금 그 템플릿의 수정 탭으로 연다. */
	initial?: { tabId: string; itemId?: string | number }
}

/**
 * 앱 데이터 편집(manager 이상) — 아이콘 버튼 하나와, 누르면 뜨는 큰 모달. 모든 화면이 같은 껍데기를 쓰고
 * 화면마다 넘기는 탭(무엇을 보여 주고 고치나)만 다르다. 이 컴포넌트는 권한을 보지 않는다 — 보일지는
 * 부르는 화면이, 막는 것은 Payload access가 정한다.
 */
export function DataEditor({ subject, tabs, initial, trigger }: DataEditorProps) {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const requested = searchParams.get(EDIT_PARAM)
	const active = tabs.find((tab) => tab.id === requested)

	const itemId = searchParams.get(ITEM_PARAM)

	const goTo = (tabId: string | null, nextItemId?: string | number) => {
		const next = new URLSearchParams(searchParams)
		if (tabId) next.set(EDIT_PARAM, tabId)
		else next.delete(EDIT_PARAM)
		if (tabId && nextItemId !== undefined) next.set(ITEM_PARAM, String(nextItemId))
		else if (!tabId) next.delete(ITEM_PARAM)
		const query = next.toString()
		// 서버 왕복 없이 주소만 바꾼다(`use-manager-mode.ts`와 같은 이유).
		window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname)
	}
	const open = () => goTo(initial?.tabId ?? tabs[0].id, initial?.itemId)

	return (
		<Dialog open={active !== undefined} onOpenChange={(open) => !open && goTo(null)}>
			{trigger ? (
				trigger(open)
			) : (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							data-slot="data-editor-trigger"
							variant="ghost"
							size="icon-lg"
							aria-label={`${subject} 데이터 편집`}
							onClick={open}
						>
							<DataBase aria-hidden />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom" sideOffset={8}>
						{subject} 데이터 편집
					</TooltipContent>
				</Tooltip>
			)}
			{/* ponytail: 크기는 「아주 큰 팝업」(사용자)의 임시값 — look은 UI 담당이 정한다. */}
			<DialogContent
				data-slot="data-editor"
				className="flex max-h-[85vh] flex-col sm:max-w-5xl"
			>
				<DialogHeader>
					<DialogTitle>{subject} 데이터 편집</DialogTitle>
					{/* 내 작업물(휘발)과 앱 데이터를 헷갈리지 않게 상태 색으로 띄운다(사용자 2026-10-13). */}
					<DialogDescription className="rounded-md bg-warning/15 px-3 py-2 text-warning">
						<DataBase aria-hidden className="mr-1 inline align-text-bottom" />
						지금 고치는 것은 내 작업물이 아니라 앱의 데이터예요. 저장하면 모든
						사용자에게 바로 반영돼요.
					</DialogDescription>
				</DialogHeader>
				<ToggleGroup
					type="single"
					variant="outline"
					spacing={0}
					value={active?.id ?? ''}
					onValueChange={(value) => value && goTo(value)}
					aria-label={`${subject} 데이터 편집 탭`}
				>
					{tabs.map((tab) => (
						<ToggleGroupItem key={tab.id} value={tab.id}>
							{tab.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{active?.render({ goTo, itemId })}
				</div>
			</DialogContent>
		</Dialog>
	)
}

export type DataEditorColumn<Row> = {
	key: string
	header: string
	cell: (row: Row) => ReactNode
}

type DataEditorTableProps<Row> = {
	columns: readonly DataEditorColumn<Row>[]
	/** `null`은 아직 읽는 중이다. */
	rows: readonly Row[] | null
	rowKey: (row: Row) => string | number
	empty: string
}

/** 데이터 편집의 목록 — 화면이 열(무엇을 보여 주고 고치나)을 명세하고, 표 자체는 공용이다. */
export function DataEditorTable<Row>({ columns, rows, rowKey, empty }: DataEditorTableProps<Row>) {
	return (
		<Table data-slot="data-editor-table">
			<TableHeader>
				<TableRow>
					{columns.map((column) => (
						<TableHead key={column.key}>{column.header}</TableHead>
					))}
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows === null || rows.length === 0 ? (
					<TableRow>
						<TableCell colSpan={columns.length} className="text-muted-foreground">
							{rows === null ? '불러오는 중…' : empty}
						</TableCell>
					</TableRow>
				) : (
					rows.map((row) => (
						<TableRow key={rowKey(row)}>
							{columns.map((column) => (
								<TableCell key={column.key}>{column.cell(row)}</TableCell>
							))}
						</TableRow>
					))
				)}
			</TableBody>
		</Table>
	)
}
