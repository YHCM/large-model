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
import { Switch } from '@/components/ui/switch'
import { AlertCircleIcon, MicIcon, PaperclipIcon, RotateCcwIcon } from 'lucide-react'
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

// 定义风格类型
type Style = {
  id: string
  name: string
  prompt: string // 风格对应的提示词
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
  // 先设置一个默认模型占位，确保初始有值
  const [models, setModels] = useState<Model[]>([{ id: 'loading', name: '加载中...' }])
  const [selectedModel, setSelectedModel] = useState<string>(models[0].id) // 初始就选中第一个
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // 新增：是否显示思考过程的开关
  const [showReasoning, setShowReasoning] = useState(false);
  
  // 新增：风格选择相关
  const [styles, setStyles] = useState<Style[]>([
    { id: 'default', name: '默认', prompt: '请自然地回答问题' },
    { id: 'professional', name: '专业', prompt: '请用专业、正式的语言回答，使用行业术语' },
    { id: 'casual', name: '随意', prompt: '请用轻松、随意的口语化方式回答' },
    { id: 'detailed', name: '详细', prompt: '请提供详细、全面的回答，包含尽可能多的信息' },
    { id: 'concise', name: '简洁', prompt: '请用简洁明了的语言回答，只说重点' },
    { id: 'humorous', name: '幽默', prompt: '请用幽默风趣的方式回答，适当加入玩笑' },
  ]);
  const [selectedStyle, setSelectedStyle] = useState<string>('default');

  // 加载可用模型列表
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models')
        if (!response.ok) {
          throw new Error('获取模型列表失败')
        }
        const data = await response.json()
        const modelList = data.models.map((model: string) => ({
          id: model,
          name: model,
        }))

        // 模型加载成功后替换列表，并强制选中第一个
        setModels(modelList)
        setSelectedModel(modelList[0].id)
      } catch (err) {
        console.error('加载模型失败:', err)
        setError('无法连接到后端服务，请检查服务是否启动')
        // 失败时使用预设模型
        const fallbackModels = [{ id: 'default', name: '默认模型' }]
        setModels(fallbackModels)
        setSelectedModel(fallbackModels[0].id)
      }
    }

    fetchModels()
  }, [])

  // 确保模型列表更新时，selectedModel始终有效
  useEffect(() => {
    if (models.length > 0 && !models.some((m) => m.id === selectedModel)) {
      setSelectedModel(models[0].id)
    }
  }, [models, selectedModel])

  // 处理消息发送
  const sendMessage = useCallback(
    async (userMessage: ChatMessage) => {
      if (!selectedModel) {
        setError('请等待模型加载完成')
        setIsTyping(false)
        return
      }

      try {
        // 获取当前选择的风格提示词
        const stylePrompt = styles.find(style => style.id === selectedStyle)?.prompt || '';
        
        // 构建带有风格提示的用户消息
        const styledMessage = `${stylePrompt}\n\n用户的问题：${userMessage.content}`;

        const history = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))

        const assistantMessageId = nanoid()
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          content: '',
          role: 'assistant',
          timestamp: new Date(),
          isStreaming: true,
          reasoning: showReasoning ? '' : undefined // 根据开关决定是否包含思考字段
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingMessageId(assistantMessageId)

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            message: styledMessage, // 发送带风格的消息
            history: history,
            showReasoning: showReasoning // 传递是否需要思考过程的参数
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || '请求失败')
        }

        const data = await response.json()

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === assistantMessageId) {
              return {
                ...msg,
                content: data.response,
                reasoning: showReasoning ? data.reasoning : undefined, // 设置思考过程
                isStreaming: false,
              }
            }
            return msg
          }),
        )
      } catch (err) {
        console.error('发送消息失败:', err)
        setError(err instanceof Error ? err.message : '发送消息时发生错误')
        setMessages((prev) => prev.filter((msg) => !msg.isStreaming))
      } finally {
        setIsTyping(false)
        setStreamingMessageId(null)
      }
    },
    [messages, selectedModel, styles, selectedStyle, showReasoning], // 添加新的依赖
  )

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault()

      if (!inputValue.trim() || isTyping || !selectedModel) return

      setError(null)

      const userMessage: ChatMessage = {
        id: nanoid(),
        content: inputValue.trim(),
        role: 'user',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue('')
      setIsTyping(true)

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
    // 重置风格和思考开关
    setSelectedStyle('default')
    setShowReasoning(false)
  }, [])

  return (
    <div className="fixed inset-0 m-4 overflow-hidden">
      <div className="flex h-full w-full flex-col rounded-xl border bg-background shadow-lg">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-sm">
          {/* 头部 */}
          <div className="flex flex-wrap items-center justify-between border-b bg-muted/50 px-4 py-3 gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500" />
                <span className="font-medium text-sm">AI Assistant</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <span className="text-muted-foreground text-xs">
                {models.find((m) => m.id === selectedModel)?.name || '加载中...'}
              </span>
            </div>
            
            {/* 新增：风格选择器 */}
            <PromptInputModelSelect
              value={selectedStyle}
              onValueChange={setSelectedStyle}
              disabled={isTyping}
            >
              <PromptInputModelSelectTrigger className="w-[140px]">
                <PromptInputModelSelectValue placeholder="选择风格" />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {styles.map((style) => (
                  <PromptInputModelSelectItem key={style.id} value={style.id}>
                    {style.name}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
            
            {/* 新增：是否显示思考过程的开关 */}
            <div className="flex items-center gap-2">
              <span className="text-xs">显示思考过程</span>
              <Switch
                checked={showReasoning}
                onCheckedChange={setShowReasoning}
                disabled={isTyping}
              />
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