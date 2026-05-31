import { useCallback, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { liquid } from '@codemirror/lang-liquid'
import { StateEffect, StateField, RangeSet } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import { useEditorContext } from '../context/EditorContext'

const setHighlightEffect = StateEffect.define<{ from: number; to: number } | null>()

const highlightField = StateField.define<RangeSet<Decoration>>({
  create: () => RangeSet.empty,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setHighlightEffect)) {
        if (effect.value === null) return RangeSet.empty
        const { from, to } = effect.value
        if (from < to) {
          return RangeSet.of([
            Decoration.mark({ class: 'cm-selection-highlight' }).range(from, to),
          ])
        }
        return RangeSet.empty
      }
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

const highlightTheme = EditorView.theme({
  '.cm-selection-highlight': { backgroundColor: '#bfdbfe' },
})

export function CodePane() {
  const { template, updateTemplate, selectedElement } = useEditorContext()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const view = editorViewRef.current
    if (!view) return

    if (selectedElement) {
      const docLength = view.state.doc.length
      const from = Math.min(selectedElement.start, docLength)
      const to = Math.min(selectedElement.end, docLength)
      view.dispatch({
        effects: [
          setHighlightEffect.of({ from, to }),
          EditorView.scrollIntoView(from),
        ],
      })
    } else {
      view.dispatch({ effects: [setHighlightEffect.of(null)] })
    }
  }, [selectedElement])

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorViewRef.current = view
  }, [])

  const handleChange = useCallback(
    (value: string) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        updateTemplate(value)
      }, 300)
    },
    [updateTemplate]
  )

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <CodeMirror
        value={template}
        extensions={[liquid(), highlightField, highlightTheme]}
        onChange={handleChange}
        onCreateEditor={handleCreateEditor}
      />
    </div>
  )
}
