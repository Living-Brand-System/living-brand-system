'use client'

import { useFormFields } from '@payloadcms/ui'
import type { FormState } from 'payload'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import type { AgentChatReaction } from '@/features/agent-chat/types'
import { cn } from '@/lib/utils'
import { fieldNumber, fieldRowCount, fieldString } from '../shared/form-fields'

type CountedItem = {
	callCount?: number | null
	name?: string | null
}

type MessageRow = {
	aiUsage?: {
		inputTokens?: number | null
		model?: string | null
		outputTokens?: number | null
		totalTokens?: number | null
	} | null
	messageId?: string | null
	reaction?: AgentChatReaction | null
	role?: string | null
	text?: string | null
	usedSkills?: CountedItem[] | null
	usedTools?: CountedItem[] | null
}

function buildCountedItems(fields: FormState, path: string): CountedItem[] {
	return Array.from({ length: fieldRowCount(fields, path) }, (_, index) => ({
		callCount: fieldNumber(fields, `${path}.${index}.callCount`),
		name: fieldString(fields, `${path}.${index}.name`),
	}))
}

function buildMessages(fields: FormState): MessageRow[] {
	return Array.from({ length: fieldRowCount(fields, 'messages') }, (_, index) => {
		const path = `messages.${index}`

		return {
			aiUsage: {
				inputTokens: fieldNumber(fields, `${path}.aiUsage.inputTokens`),
				model: fieldString(fields, `${path}.aiUsage.model`),
				outputTokens: fieldNumber(fields, `${path}.aiUsage.outputTokens`),
				totalTokens: fieldNumber(fields, `${path}.aiUsage.totalTokens`),
			},
			messageId: fieldString(fields, `${path}.messageId`),
			reaction: fieldString(fields, `${path}.reaction`) as MessageRow['reaction'],
			role: fieldString(fields, `${path}.role`),
			text: fieldString(fields, `${path}.text`),
			usedSkills: buildCountedItems(fields, `${path}.usedSkills`),
			usedTools: buildCountedItems(fields, `${path}.usedTools`),
		}
	})
}

function formatItems(items?: CountedItem[] | null) {
	const labels = items
		?.map((item) => {
			if (!item.name) {
				return null
			}

			return item.callCount && item.callCount > 1
				? `${item.name} x${item.callCount}`
				: item.name
		})
		.filter(Boolean)

	return labels?.length ? labels.join(', ') : '-'
}

const HEAD_CLASS = 'align-top text-sm font-semibold text-muted-foreground'
const CELL_CLASS = 'align-top'

function formatTokens(usage?: MessageRow['aiUsage']) {
	const total =
		usage?.totalTokens ??
		(typeof usage?.inputTokens === 'number' && typeof usage?.outputTokens === 'number'
			? usage.inputTokens + usage.outputTokens
			: null)

	return typeof total === 'number' ? total.toLocaleString('ko-KR') : '-'
}

export function AgentChatMessagesTable() {
	const messages = useFormFields(([fields]) => buildMessages(fields))

	if (messages.length === 0) {
		return (
			<section className="mb-5">
				<h3 className="m-0 mb-2.5">대화 메시지</h3>
				<p className="m-0 text-muted-foreground">기록된 메시지가 없습니다.</p>
			</section>
		)
	}

	return (
		<section className="mb-5">
			<h3 className="m-0 mb-2.5">대화 메시지</h3>
			<Table className="min-w-[960px] border-collapse">
				<TableHeader>
					<TableRow>
						<TableHead scope="col" className={HEAD_CLASS}>
							#
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							Role
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							Message
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							Model
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							Reaction
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							Tools
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							Skills
						</TableHead>
						<TableHead scope="col" className={HEAD_CLASS}>
							Tokens
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{messages.map((message, index) => (
						<TableRow key={message.messageId ?? index}>
							<TableCell className={CELL_CLASS}>{index + 1}</TableCell>
							<TableCell className={CELL_CLASS}>{message.role ?? '-'}</TableCell>
							<TableCell
								className={cn(CELL_CLASS, 'max-w-[420px] whitespace-pre-wrap')}
							>
								{message.text || '-'}
							</TableCell>
							<TableCell className={CELL_CLASS}>
								{message.aiUsage?.model ?? '-'}
							</TableCell>
							<TableCell className={CELL_CLASS}>{message.reaction ?? '-'}</TableCell>
							<TableCell className={CELL_CLASS}>
								{formatItems(message.usedTools)}
							</TableCell>
							<TableCell className={CELL_CLASS}>
								{formatItems(message.usedSkills)}
							</TableCell>
							<TableCell className={CELL_CLASS}>
								{formatTokens(message.aiUsage)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	)
}
