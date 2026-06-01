import { useState, useCallback } from 'react'
import { ThreadPrimitive, ComposerPrimitive, useComposerRuntime } from '@assistant-ui/react'
import { useEditorContext } from '../context/EditorContext.js'
import { RuntimeProvider } from './RuntimeProvider.js'
import { handleAssistantResponse } from './template-handler.js'
import { registerTools } from '../tools/register-tools.js'
import { generateSuggestions } from './suggestion-adapter.js'
import { HistoryPanel } from './HistoryPanel.js'
import type { Suggestion } from './suggestion-adapter.js'

const [AdjustParameterToolUI, AskQuestionToolUI, ConfigurePreferencesToolUI] = registerTools()

// Minimal message renderer — styled messages come in a later phase
const MessageComponent = () => null

function SuggestionChips({ suggestions }: { suggestions: Suggestion[] }) {
  const composerRuntime = useComposerRuntime()

  const handleSend = (prompt: string) => {
    composerRuntime.setText(prompt)
    composerRuntime.send()
  }

  if (suggestions.length === 0) return null

  return (
    <div
      data-testid="suggestion-chips"
      style={{
        padding: '4px 8px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        borderTop: '1px solid #e5e7eb',
      }}
    >
      {suggestions.map((s) => (
        <button
          key={s.displayLabel}
          data-testid={`suggestion-chip-${s.displayLabel.replace(/\s+/g, '-').toLowerCase()}`}
          onClick={() => handleSend(s.prompt)}
          style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '9999px',
            border: '1px solid #d1d5db',
            background: '#f9fafb',
            cursor: 'pointer',
          }}
        >
          {s.displayLabel}
        </button>
      ))}
    </div>
  )
}

export function AiPanel() {
  const { schema, data, updateTemplate, updateData, selectedElement } = useEditorContext()
  const [wasUpdated, setWasUpdated] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const suggestions = generateSuggestions(
    selectedElement
      ? {
          loc: selectedElement.loc,
          tagName: selectedElement.tagName,
          computedStyles: selectedElement.computedStyles,
          snippet: selectedElement.snippet,
        }
      : null
  )

  const handleAiMessage = useCallback(
    (text: string) => {
      const result = handleAssistantResponse(text, updateTemplate)
      if (result.success) {
        if (result.contextUpdates) {
          updateData({ ...data, ...result.contextUpdates })
        }
        setWasUpdated(true)
        setTimeout(() => setWasUpdated(false), 3000)
      }
    },
    [updateTemplate, updateData, data],
  )

  return (
    <div
      style={{
        borderLeft: '1px solid #e5e7eb',
        width: '320px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, flex: 1 }}>AI Assistant</h2>
        {wasUpdated && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#16a34a',
              backgroundColor: '#f0fdf4',
              padding: '2px 8px',
              borderRadius: '9999px',
            }}
          >
            Template updated
          </span>
        )}
        <button
          data-testid="history-toggle"
          onClick={() => setShowHistory((prev) => !prev)}
          style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: showHistory ? '#f3f4f6' : '#ffffff',
            cursor: 'pointer',
          }}
        >
          {showHistory ? 'Chat' : 'History'}
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {showHistory ? (
          <HistoryPanel />
        ) : (
          <RuntimeProvider
            schema={schema}
            onAssistantMessage={handleAiMessage}
            selectedElement={selectedElement}
          >
            <AdjustParameterToolUI />
            <AskQuestionToolUI />
            <ConfigurePreferencesToolUI />
            <ThreadPrimitive.Root style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
              <ThreadPrimitive.Viewport>
                <ThreadPrimitive.Messages
                  components={{ Message: MessageComponent }}
                />
              </ThreadPrimitive.Viewport>
            </ThreadPrimitive.Root>
            <SuggestionChips suggestions={suggestions} />
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '8px' }}>
              <ComposerPrimitive.Root>
                <ComposerPrimitive.Input placeholder="Ask the AI to edit your template..." />
                <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
              </ComposerPrimitive.Root>
            </div>
          </RuntimeProvider>
        )}
      </div>
    </div>
  )
}
