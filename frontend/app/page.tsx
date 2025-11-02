'use client'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ui/shadcn-io/ai/conversation'
import { Loader } from '@/components/ui/shadcn-io/ai/loader'
import { Message, MessageAvatar, MessageContent } from '@/components/ui/shadcn-io/ai/message'
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ui/shadcn-io/ai/prompt-input'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ui/shadcn-io/ai/reasoning'
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ui/shadcn-io/ai/source'
import { Response } from '@/components/ui/shadcn-io/ai/response' // 导入Response组件用于Markdown渲染
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MicIcon, PaperclipIcon, RotateCcwIcon } from 'lucide-react'
import { nanoid } from 'nanoid'
import { type FormEventHandler, useCallback, useEffect, useState } from 'react'

type ChatMessage = {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  reasoning?: string
  sources?: Array<{ title: string; url: string }>
  isStreaming?: boolean
}

const models = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B' },
]

const sampleResponses = [
  {
    content: `## Ollama API 响应格式

Ollama API 使用流式响应，返回 JSON 对象包含以下字段：

**模型响应字段：**
- \`model\` - 使用的模型名称
- \`created_at\` - 创建时间戳
- \`message\` - 消息对象
- \`done\` - 是否完成流式传输

**流式响应示例：**
\`\`\`json
{
  "model": "llama2",
  "created_at": "2023-08-04T08:52:19.385406455-07:00",
  "message": {
    "role": "assistant",
    "content": "Hello! How can I help you today?"
  },
  "done": false
}
\`\`\`

**聊天完成请求：**
\`\`\`bash
curl -X POST http://localhost:11434/api/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama2",
    "messages": [
      {
        "role": "user",
        "content": "为什么天空是蓝色的？"
      }
    ],
    "stream": true
  }'
\`\`\`

> 注意：Ollama 默认使用流式传输，可以通过 \`stream: false\` 关闭。`,
    reasoning:
      '用户需要了解 Ollama API 的响应格式，我应该提供完整的 API 字段说明和实际使用示例，包括请求和响应的具体格式。',
    sources: [
      { title: 'Ollama API 文档', url: 'https://github.com/ollama/ollama/blob/main/docs/api.md' },
      { title: 'Ollama 官方仓库', url: 'https://github.com/ollama/ollama' },
    ],
  },
]

const Example = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nanoid(),
      content:
        "Hello! I'm your AI assistant. I can help you with coding questions, explain concepts, and provide guidance on web development topics. What would you like to know?",
      role: 'assistant',
      timestamp: new Date(),
      sources: [
        { title: 'Getting Started Guide', url: '#' },
        { title: 'API Documentation', url: '#' },
      ],
    },
  ])

  const [inputValue, setInputValue] = useState('')
  const [selectedModel, setSelectedModel] = useState(models[0].id)
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)

  const simulateTyping = useCallback(
    (
      messageId: string,
      content: string,
      reasoning?: string,
      sources?: Array<{ title: string; url: string }>,
    ) => {
      let currentIndex = 0
      const typeInterval = setInterval(() => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId) {
              const currentContent = content.slice(0, currentIndex)
              return {
                ...msg,
                content: currentContent,
                isStreaming: currentIndex < content.length,
                reasoning: currentIndex >= content.length ? reasoning : undefined,
                sources: currentIndex >= content.length ? sources : undefined,
              }
            }
            return msg
          }),
        )
        currentIndex += Math.random() > 0.1 ? 1 : 0 // 模拟不同的打字速度

        if (currentIndex >= content.length) {
          clearInterval(typeInterval)
          setIsTyping(false)
          setStreamingMessageId(null)
        }
      }, 50)
      return () => clearInterval(typeInterval)
    },
    [],
  )

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault()

      if (!inputValue.trim() || isTyping) return

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: nanoid(),
        content: inputValue.trim(),
        role: 'user',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      setIsTyping(true)

      // 模拟AI响应延迟
      setTimeout(() => {
        const responseData = sampleResponses[Math.floor(Math.random() * sampleResponses.length)]
        const assistantMessageId = nanoid()

        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          content: '',
          role: 'assistant',
          timestamp: new Date(),
          isStreaming: true,
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingMessageId(assistantMessageId)

        // 开始模拟打字效果
        simulateTyping(
          assistantMessageId,
          responseData.content,
          responseData.reasoning,
          responseData.sources,
        )
      }, 800)
    },
    [inputValue, isTyping, simulateTyping],
  )

  const handleReset = useCallback(() => {
    setMessages([
      {
        id: nanoid(),
        content:
          "Hello! I'm your AI assistant. I can help you with coding questions, explain concepts, and provide guidance on web development topics. What would you like to know?",
        role: 'assistant',
        timestamp: new Date(),
        sources: [
          { title: 'Getting Started Guide', url: '#' },
          { title: 'API Documentation', url: '#' },
        ],
      },
    ])
    setInputValue('')
    setIsTyping(false)
    setStreamingMessageId(null)
  }, [])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500" />
            <span className="font-medium text-sm">AI Assistant</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-muted-foreground text-xs">
            {models.find((m) => m.id === selectedModel)?.name}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2">
          <RotateCcwIcon className="size-4" />
          <span className="ml-1">Reset</span>
        </Button>
      </div>

      {/* 对话区域 */}
      <Conversation className="flex-1">
        <ConversationContent className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <Message from={message.role}>
                <MessageContent>
                  {message.isStreaming && message.content === '' ? (
                    <div className="flex items-center gap-2">
                      <Loader size={14} />
                      <span className="text-muted-foreground text-sm">Thinking...</span>
                    </div>
                  ) : message.role === 'assistant' ? (
                    // 对于AI消息，使用Response组件进行Markdown渲染
                    <Response>{message.content}</Response>
                  ) : (
                    // 对于用户消息，直接显示文本
                    message.content
                  )}
                </MessageContent>
                <MessageAvatar
                  src={
                    message.role === 'user'
                      ? 'https://github.com/dovazencot.png'
                      : 'https://github.com/vercel.png'
                  }
                  name={message.role === 'user' ? 'User' : 'AI'}
                />
              </Message>

              {/* 推理过程 */}
              {message.reasoning && (
                <div className="ml-10">
                  <Reasoning isStreaming={message.isStreaming} defaultOpen={false}>
                    <ReasoningTrigger />
                    <ReasoningContent>{message.reasoning}</ReasoningContent>
                  </Reasoning>
                </div>
              )}

              {/* 来源 */}
              {message.sources && message.sources.length > 0 && (
                <div className="ml-10">
                  <Sources>
                    <SourcesTrigger count={message.sources.length} />
                    <SourcesContent>
                      {message.sources.map((source, index) => (
                        <Source key={index} href={source.url} title={source.title} />
                      ))}
                    </SourcesContent>
                  </Sources>
                </div>
              )}
            </div>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* 输入区域 */}
      <div className="border-t p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything about development, coding, or technology..."
            disabled={isTyping}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton disabled={isTyping}>
                <PaperclipIcon size={16} />
              </PromptInputButton>
              <PromptInputButton disabled={isTyping}>
                <MicIcon size={16} />
                <span>Voice</span>
              </PromptInputButton>
              <PromptInputModelSelect
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={isTyping}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit
              disabled={!inputValue.trim() || isTyping}
              status={isTyping ? 'streaming' : 'ready'}
            />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  )
}

export default Example
