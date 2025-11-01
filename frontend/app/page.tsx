'use client'

import { useState, useEffect } from 'react'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ui/shadcn-io/ai/conversation'
import { Message, MessageAvatar, MessageContent } from '@/components/ui/shadcn-io/ai/message'
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ui/shadcn-io/ai/prompt-input'
import { Loader } from '@/components/ui/shadcn-io/ai/loader'
import { Response } from '@/components/ui/shadcn-io/ai/response'
import { SendIcon, PaperclipIcon, MicIcon } from 'lucide-react'
import { Action, Actions } from '@/components/ui/shadcn-io/ai/actions'
import { CopyIcon, RefreshCcwIcon } from 'lucide-react'

// 定义消息类型
interface ChatMessage {
  id: string
  content: string
  from: 'user' | 'assistant'
  timestamp: Date
}

// 对话风格（提示词）选项
const conversationStyles = [
  { id: 'default', name: '默认', prompt: '你是一个乐于助人的AI助手，用简洁明了的语言回答问题。' },
  { id: 'technical', name: '技术', prompt: '你是技术专家，回答要专业、详细，适合开发者理解。' },
  { id: 'friendly', name: '友好', prompt: '你是友好的聊天伙伴，用轻松活泼的语气回答问题。' },
  { id: 'concise', name: '简洁', prompt: '用最简洁的语言回答问题，直击要点，不超过3句话。' },
]

export default function SimpleChatApp() {
  // 状态管理
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState(conversationStyles[0])
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('')

  // 处理发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      from: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setCurrentAssistantMessage('')

    try {
      // 调用后端API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          systemPrompt: selectedStyle.prompt,
          // 可以传递历史消息用于上下文
          history: messages.map((m) => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      })

      if (!response.ok) throw new Error('API请求失败')

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let assistantMessage = ''
      const assistantMessageId = (Date.now() + 1).toString()

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        assistantMessage += chunk
        setCurrentAssistantMessage(assistantMessage)
      }

      // 添加完整的AI回复
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          content: assistantMessage,
          from: 'assistant',
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error('聊天错误:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          content: '抱歉，处理你的请求时出错了，请重试。',
          from: 'assistant',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
      setCurrentAssistantMessage('')
    }
  }

  // 处理键盘回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 复制消息内容
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  // 重新生成回复
  const handleRetry = async (messageId: string) => {
    // 找到对应的用户消息
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex === -1 || messageIndex === 0) return

    const userMessage = messages[messageIndex - 1]
    if (userMessage.from !== 'user') return

    // 移除当前和后续消息
    setMessages((prev) => prev.slice(0, messageIndex))
    setIsLoading(true)
    setCurrentAssistantMessage('')

    try {
      // 调用后端API重新生成
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          systemPrompt: selectedStyle.prompt,
          history: messages.slice(0, messageIndex - 1).map((m) => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      })

      if (!response.ok) throw new Error('API请求失败')

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        assistantMessage += chunk
        setCurrentAssistantMessage(assistantMessage)
      }

      // 添加新的AI回复
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: assistantMessage,
          from: 'assistant',
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error('重新生成错误:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: '抱歉，重新生成时出错了，请重试。',
          from: 'assistant',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
      setCurrentAssistantMessage('')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 头部 */}
      <header className="border-b p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">AI 聊天</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">对话风格:</span>
          <select
            value={selectedStyle.id}
            onChange={(e) => {
              const style = conversationStyles.find((s) => s.id === e.target.value)
              if (style) setSelectedStyle(style)
            }}
            className="border rounded-md px-2 py-1 text-sm"
          >
            {conversationStyles.map((style) => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* 聊天内容区域 */}
      <Conversation className="flex-1 relative overflow-hidden">
        <ConversationContent className="p-4">
          {messages.map((message) => (
            <Message
              key={message.id}
              from={message.from}
              className={`mb-4 ${message.from === 'assistant' ? 'items-start' : 'items-end'}`}
            >
              <MessageContent>
                <Response>{message.content}</Response>
              </MessageContent>
              <MessageAvatar
                src={
                  message.from === 'user'
                    ? 'https://picsum.photos/id/1005/200'
                    : 'https://picsum.photos/id/1001/200'
                }
                name={message.from === 'user' ? 'You' : 'AI'}
              />

              {/* 仅AI消息显示操作按钮 */}
              {message.from === 'assistant' && (
                <Actions className="mt-2">
                  <Action label="复制" onClick={() => handleCopy(message.content)}>
                    <CopyIcon className="size-4" />
                  </Action>
                  <Action label="重新生成" onClick={() => handleRetry(message.id)}>
                    <RefreshCcwIcon className="size-4" />
                  </Action>
                </Actions>
              )}
            </Message>
          ))}

          {/* 显示正在输入的AI消息 */}
          {isLoading && (
            <Message from="assistant" className="mb-4 items-start">
              <MessageContent>
                {currentAssistantMessage ? (
                  <Response>{currentAssistantMessage}</Response>
                ) : (
                  <Loader size={24} />
                )}
              </MessageContent>
              <MessageAvatar src="https://picsum.photos/id/1001/200" name="AI" />
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* 输入区域 */}
      <div className="border-t p-4">
        <PromptInput
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="min-h-[80px]"
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton disabled={isLoading}>
                <PaperclipIcon size={16} />
              </PromptInputButton>
              <PromptInputButton disabled={isLoading}>
                <MicIcon size={16} />
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input.trim() || isLoading} onClick={handleSend}>
              <SendIcon size={16} />
            </PromptInputSubmit>
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  )
}
