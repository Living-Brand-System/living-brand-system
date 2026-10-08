import { Empty, EmptyDescription } from '@/components/ui/empty'
import {
	MessageScroller,
	MessageScrollerButton,
	MessageScrollerContent,
	MessageScrollerItem,
	MessageScrollerProvider,
	MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import type { AgentChatMessage } from '@/features/agent-chat/agent-chat.agent'
import { AgentChatErrorBubble } from './agent-chat-bubbles'
import { AgentChatMessageItem } from './agent-chat-message-item'

type AgentChatMessageListProps = {
	messages: AgentChatMessage[]
	error?: Error
	isBusy?: boolean
}

export function AgentChatMessageList({
	messages,
	error,
	isBusy = false,
}: AgentChatMessageListProps) {
	const isEmpty = messages.length === 0 && !error
	const activeMessageId = isBusy ? messages.at(-1)?.id : undefined
	let lastAssistantMessageId: string | undefined
	for (const message of messages) {
		if (message.role === 'assistant') lastAssistantMessageId = message.id
	}

	return (
		<MessageScrollerProvider>
			<MessageScroller className="min-h-0 flex-1">
				<MessageScrollerViewport className="scrollbar-none scroll-smooth motion-reduce:scroll-auto">
					<MessageScrollerContent className="gap-3 p-3">
						{isEmpty ? (
							<MessageScrollerItem>
								<AgentEmptyMessage />
							</MessageScrollerItem>
						) : (
							messages.map((message) => (
								<MessageScrollerItem
									key={message.id}
									className="flex flex-col motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out"
									messageId={message.id}
									scrollAnchor={message.role === 'user'}
								>
									<AgentChatMessageItem
										message={message}
										canReact={
											!isBusy &&
											message.role === 'assistant' &&
											message.id === lastAssistantMessageId
										}
										isActive={message.id === activeMessageId}
									/>
								</MessageScrollerItem>
							))
						)}
						{error && (
							<MessageScrollerItem>
								<AgentChatErrorBubble error={error} />
							</MessageScrollerItem>
						)}
					</MessageScrollerContent>
				</MessageScrollerViewport>
				<MessageScrollerButton />
			</MessageScroller>
		</MessageScrollerProvider>
	)
}

function AgentEmptyMessage() {
	return (
		<Empty>
			<EmptyDescription>이 가이드라인에 대해 물어보세요.</EmptyDescription>
		</Empty>
	)
}
