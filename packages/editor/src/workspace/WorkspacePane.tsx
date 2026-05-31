import type { Segment } from '../layout/Toolbar'
import { PreviewPane } from './PreviewPane'
import { CodePane } from './CodePane'
import { ContextPane } from './ContextPane'

interface WorkspacePaneProps {
  activeSegment: Segment
}

export function WorkspacePane({ activeSegment }: WorkspacePaneProps) {
  return (
    <div style={{ overflow: 'hidden', position: 'relative', height: '100%' }}>
      <div
        data-testid="pane-preview"
        style={{
          display: activeSegment === 'preview' ? 'flex' : 'none',
          height: '100%',
          flexDirection: 'column',
        }}
      >
        <PreviewPane />
      </div>
      <div
        data-testid="pane-code"
        style={{
          display: activeSegment === 'code' ? 'flex' : 'none',
          height: '100%',
          flexDirection: 'column',
        }}
      >
        <CodePane />
      </div>
      <div
        data-testid="pane-context"
        style={{
          display: activeSegment === 'context' ? 'flex' : 'none',
          height: '100%',
          flexDirection: 'column',
        }}
      >
        <ContextPane />
      </div>
    </div>
  )
}
