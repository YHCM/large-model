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
import { Response } from '@/components/ui/shadcn-io/ai/response'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MicIcon, PaperclipIcon, RotateCcwIcon, AlertCircleIcon } from 'lucide-react'
import { nanoid } from 'nanoid'
import { type FormEventHandler, useCallback, useEffect, useState } from 'react'

// 定义消息类型
type ChatMessage = {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  reasoning?: string
  sources?: Array<{ title: string; url: string }>
  isStreaming?: boolean
}

// 定义模型类型
type Model = {
  id: string
  name: string
}

const Example = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nanoid(),
      content: '你好！我是你的AI助手，有什么可以帮助你的吗？',
      role: 'assistant',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 加载可用模型列表
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models')
        if (!response.ok) {
          throw new Error('获取模型列表失败')
        }
        const data = await response.json()
        // 转换为 {id, name} 格式
        console.log('API返回原始数据:', data) // 确认是 {"models":["qwen3","llama3","deepseek-r1"]}
        const modelList = data.models.map((model: string) => ({
          id: model,
          name: model,
        }))
        console.log('转换后的模型列表:', modelList) // 应该是 [{id: 'qwen3', name: 'qwen3'}, ...]
        setModels(modelList)
        if (modelList.length > 0) {
          setSelectedModel(modelList[0].id)
          console.log('设置默认模型:', modelList[0].id) // 确认执行了这行
        }
        setModels(modelList)
        // 默认选择第一个模型
        if (modelList.length > 0) {
          setSelectedModel(modelList[0].id)
        }
      } catch (err) {
        console.error('加载模型失败:', err)
        setError('无法连接到后端服务，请检查服务是否启动')
      }
    }

    fetchModels()
  }, [])

  // 处理真实API调用
  const sendMessage = useCallback(
    async (userMessage: ChatMessage) => {
      try {
        // 准备历史记录
        const history = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

        // 创建AI消息占位符
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

        // 调用后端API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            message: userMessage.content,
            history: history,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || '请求失败')
        }

        const data = await response.json()

        // 更新AI消息
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === assistantMessageId) {
              return {
                ...msg,
                content: data.response,
                isStreaming: false,
              }
            }
            return msg
          }),
        )
      } catch (err) {
        console.error('发送消息失败:', err)
        setError(err instanceof Error ? err.message : '发送消息时发生错误')
        // 移除未完成的AI消息
        setMessages((prev) => prev.filter((msg) => !msg.isStreaming))
      } finally {
        setIsTyping(false)
        setStreamingMessageId(null)
      }
    },
    [messages, selectedModel],
  )

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault()

      if (!inputValue.trim() || isTyping || !selectedModel) return

      // 清除错误信息
      setError(null)

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

      // 发送消息到后端
      sendMessage(userMessage)
    },
    [inputValue, isTyping, selectedModel, sendMessage],
  )

  const handleReset = useCallback(() => {
    setMessages([
      {
        id: nanoid(),
        content: '你好！我是你的AI助手，有什么可以帮助你的吗？',
        role: 'assistant',
        timestamp: new Date(),
      },
    ])
    setInputValue('')
    setIsTyping(false)
    setStreamingMessageId(null)
    setError(null)
  }, [])

  return (
    <div className="fixed inset-0 m-4 overflow-hidden">
      <div className="flex h-full w-full flex-col rounded-xl border bg-background shadow-lg">
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
                {models.find(m => m.id === selectedModel)?.name || '加载中...'}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2">
              <RotateCcwIcon className="size-4" />
              <span className="ml-1">重置对话</span>
            </Button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 flex items-center">
              <AlertCircleIcon className="w-4 h-4 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
          )}

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
                          <span className="text-muted-foreground text-sm">思考中...</span>
                        </div>
                      ) : message.role === 'assistant' ? (
                        <Response>{message.content}</Response>
                      ) : (
                        message.content
                      )}
                    </MessageContent>
                    <MessageAvatar
                      src={
                        message.role === 'user'
                          ? 'https://picsum.photos/id/1005/200'
                          : 'https://picsum.photos/id/1001/200'
                      }
                      name={message.role === 'user' ? '用户' : 'AI'}
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
                placeholder="请输入你的问题..."
                disabled={isTyping || !selectedModel}
              />
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputButton disabled={isTyping || !selectedModel}>
                    <PaperclipIcon size={16} />
                  </PromptInputButton>
                  <PromptInputButton disabled={isTyping || !selectedModel}>
                    <MicIcon size={16} />
                    <span>语音</span>
                  </PromptInputButton>
                  <PromptInputModelSelect
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    disabled={isTyping}
                  >
                    <PromptInputModelSelectTrigger>
                      {/* 直接显示选中的模型名称 */}
                      <span>
                        {models.find(m => m.id === selectedModel)?.name || '选择模型'}
                      </span>
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
                  disabled={!inputValue.trim() || isTyping || !selectedModel}
                  status={isTyping ? 'streaming' : 'ready'}
                />
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Example
