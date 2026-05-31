import { useState, useCallback, type ComponentType } from 'react'
import { ThreadPrimitive, ComposerPrimitive } from '@assistant-ui/react'
import { useEditorContext } from '../context/EditorContext.js'
import { RuntimeProvider } from './RuntimeProvider.js'
import { handleAssistantResponse } from './template-handler.js'

// Minimal message renderer — styled messages come in a later phase
const MessageComponent: ComponentType = () => null

export function AiPanel() {
  const { schema, updateTemplate } = useEditorContext()
  const [wasUpdated, setWasUpdated] = useState(false)

  const handleAiMessage = useCallback(
    (text: string) => {
      const result = handleAssistantResponse(text, updateTemplate)
      if (result.success) {
        setWasUpdated(true)
        setTimeout(() => setWasUpdated(false), 3000)
      }
    },
    [updateTemplate],
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
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>AI Assistant</h2>
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
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <RuntimeProvider schema={schema} onAssistantMessage={handleAiMessage}>
          <ThreadPrimitive.Root style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
            <ThreadPrimitive.Viewport>
              <ThreadPrimitive.Messages
                components={{ Message: MessageComponent }}
              />
            </ThreadPrimitive.Viewport>
          </ThreadPrimitive.Root>
          <div style={{ borderTop: '1px solid #e5e7eb', padding: '8px' }}>
            <ComposerPrimitive.Root>
              <ComposerPrimitive.Input placeholder="Ask the AI to edit your template..." />
              <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </div>
        </RuntimeProvider>
      </div>
    </div>
  )
}
