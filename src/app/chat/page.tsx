'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Badge } from '@/components/common/Badge'
import { CodeBlock } from '@/components/common/CodeBlock'
import { Spinner } from '@/components/common/Spinner'
import {
  Send,
  Bot,
  User,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useChat } from '@/hooks/useChat'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string | Date
  toolUse?: any[]
  isLoading?: boolean
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  timestamp,
  toolUse,
  isLoading,
}) => {
  if (role === 'system') {
    return (
      <div className="flex justify-center py-4">
        <Badge variant="info">{content}</Badge>
      </div>
    )
  }

  const isUser = role === 'user'

  const formatTime = (ts: any) => {
    if (!ts) return ''
    try {
      const d = typeof ts === 'string' ? new Date(ts) : ts
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return String(ts)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg ${
          isUser ? 'bg-accent-teal/20 border-accent-teal/50' : 'bg-dark-surface border-dark-border'
        } border rounded-lg p-4`}
      >
        <div className="flex items-start gap-2 mb-2">
          {!isUser && <Bot size={16} className="text-accent-cyan mt-1 flex-shrink-0" />}
          {isUser && <User size={16} className="text-accent-teal mt-1 flex-shrink-0" />}
          <div className="flex-1">
            <p className="text-xs text-text-muted font-medium mb-1">
              {isUser ? 'You' : 'AI Assistant'}
            </p>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span className="text-sm text-text-secondary">Thinking...</span>
              </div>
            ) : (
              <>
                <p className={`text-sm whitespace-pre-wrap ${isUser ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {content}
                </p>
                {timestamp && (
                  <p className="text-xs text-text-muted mt-2">
                    {formatTime(timestamp)}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const SuggestedQueries = ({
  onSelect,
}: {
  onSelect: (query: string) => void
}) => {
  const suggestions = [
    'Show me recent 5xx errors from the API gateway',
    'Summarize Postgres database errors and warnings',
    'List the most recent authentication failures',
    'What is the overall error rate across all log sources?',
  ]

  return (
    <div className="space-y-2 mt-4">
      <p className="text-xs text-text-muted uppercase font-semibold text-center">Suggested Queries</p>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((query, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(query)}
            className="text-left text-sm p-3 rounded-lg border border-dark-border hover:border-accent-teal bg-dark-surface-dark/50 hover:bg-dark-surface transition-all"
          >
            {query}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MCPTracePanelProps {
  messages: any[]
  isExpanded: boolean
  onToggle: () => void
}

const MCPTracePanel: React.FC<MCPTracePanelProps> = ({
  messages,
  isExpanded,
  onToggle,
}) => {
  const messagesWithTraces = messages.filter((m) => m.toolUse && m.toolUse.length > 0)

  return (
    <Card className="mt-6 bg-dark-surface-dark/50 border-dark-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-surface-dark/70 transition-colors"
      >
        <h4 className="font-semibold text-text-primary flex items-center gap-2">
          <Zap size={16} className="text-accent-cyan" />
          MCP Protocol Trace Logs
        </h4>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="border-t border-dark-border p-4 max-h-60 overflow-y-auto space-y-2 font-mono text-xs">
          {messagesWithTraces.length === 0 ? (
            <p className="text-text-muted">No tool calls made in this session.</p>
          ) : (
            messagesWithTraces.map((msg, msgIdx) => (
              <div key={msgIdx} className="space-y-1 pb-2 border-b border-dark-border/30 last:border-b-0">
                <p className="text-text-muted font-semibold">Interaction #{msgIdx + 1}:</p>
                {msg.toolUse.map((trace: any, traceIdx: number) => {
                  const traceTypeColors: Record<string, string> = {
                    system: 'text-accent-blue',
                    mcp_protocol: 'text-accent-pink',
                    mcp_call: 'text-accent-yellow',
                    mcp_response: 'text-accent-green',
                    llm: 'text-accent-pink-light',
                    error: 'text-accent-red font-bold'
                  }
                  const typeColor = traceTypeColors[trace.type] || 'text-text-muted'
                  return (
                    <div key={traceIdx} className="pl-2">
                      <span className="text-text-muted">[{trace.timestamp}] </span>
                      <span className={typeColor}><b>{trace.type.toUpperCase()}:</b></span> {trace.message}
                      {trace.data && (
                        <div className="mt-1 pl-4">
                          <CodeBlock
                            code={typeof trace.data === 'string' ? trace.data : JSON.stringify(trace.data, null, 2)}
                            language="json"
                            copyable={false}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}

export default function ChatPage() {
  const { messages, isLoading, sendMessage, messagesEndRef } = useChat()
  const [input, setInput] = useState('')
  const [traceExpanded, setTraceExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSendMessage = async () => {
    if (input.trim() && !isLoading) {
      const query = input
      setInput('')
      await sendMessage(query)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSuggestedQuery = (query: string) => {
    setInput(query)
  }

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  return (
    <>
      <Header
        title="AI Log Assistant"
        subtitle="Ask questions about your logs using natural language"
      />

      <div className="p-8 h-[calc(100vh-220px)] flex flex-col">
        {/* Messages Container */}
        <Card className="flex-1 p-6 overflow-y-auto mb-6" ref={containerRef}>
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md w-full">
                <Bot size={48} className="mx-auto mb-4 text-accent-cyan opacity-50" />
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  Welcome to your Log Assistant
                </h3>
                <p className="text-text-secondary text-sm mb-6">
                  Ask any question about your Supabase logs. I'll help you find
                  issues, analyze patterns, and get insights.
                </p>
                <SuggestedQueries onSelect={handleSuggestedQuery} />
              </div>
            </div>
          ) : (
            <div>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  toolUse={msg.toolUse}
                  isLoading={isLoading && idx === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </Card>

        {/* MCP Trace Panel */}
        {messages.some((m) => m.toolUse && m.toolUse.length > 0) && (
          <div className="mb-4">
            <MCPTracePanel
              messages={messages}
              isExpanded={traceExpanded}
              onToggle={() => setTraceExpanded(!traceExpanded)}
            />
          </div>
        )}

        {/* Input Area */}
        <Card className="p-4 border-accent-teal/30">
          <div className="flex gap-3">
            <Input
              placeholder="Type your question about logs..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              variant="primary"
              size="md"
            >
              {isLoading ? <Spinner size="sm" /> : <Send size={20} />}
            </Button>
          </div>
        </Card>
      </div>
    </>
  )
}
