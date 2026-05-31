import { useEffect, useRef } from 'react'

export interface IframeSandboxProps {
  html: string
  onMessage?: (event: MessageEvent) => void
  className?: string
  selectedLoc?: string | null
}

const SELECTION_HANDLER_SCRIPT = `
<script>
(function() {
  var selectedEl = null;

  var style = document.createElement('style');
  style.textContent = '.liquid-ai-selected { outline: 2px solid #3b82f6; outline-offset: 2px; }';
  document.head.appendChild(style);

  function findDataLoc(el) {
    var current = el;
    while (current && current !== document.body) {
      if (current.getAttribute && current.getAttribute('data-loc')) return current;
      current = current.parentElement;
    }
    return null;
  }

  function clearSelection() {
    if (selectedEl) {
      selectedEl.classList.remove('liquid-ai-selected');
      selectedEl = null;
    }
  }

  document.addEventListener('click', function(e) {
    var target = findDataLoc(e.target);

    if (!target) {
      if (selectedEl) {
        clearSelection();
        window.parent.postMessage({ type: 'element-deselect' }, '*');
      }
      return;
    }

    if (target === selectedEl) {
      clearSelection();
      window.parent.postMessage({ type: 'element-deselect' }, '*');
      return;
    }

    clearSelection();
    selectedEl = target;
    target.classList.add('liquid-ai-selected');

    var cs = window.getComputedStyle(target);
    window.parent.postMessage({
      type: 'element-select',
      loc: target.getAttribute('data-loc'),
      tagName: target.tagName.toLowerCase(),
      computedStyles: {
        padding: cs.padding,
        margin: cs.margin,
        'font-size': cs.fontSize,
        color: cs.color,
        'background-color': cs.backgroundColor,
        width: cs.width,
        height: cs.height,
        display: cs.display
      }
    }, '*');
  });

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'set-selected') {
      clearSelection();
      if (e.data.loc) {
        var el = document.querySelector('[data-loc="' + e.data.loc + '"]');
        if (el) {
          el.classList.add('liquid-ai-selected');
          selectedEl = el;
        }
      }
    }
  });

  function reportHeight() {
    window.parent.postMessage({ type: 'resize', height: document.body.scrollHeight }, '*');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      reportHeight();
      var ro = new ResizeObserver(function() { reportHeight(); });
      ro.observe(document.body);
    });
  } else {
    reportHeight();
    var ro = new ResizeObserver(function() { reportHeight(); });
    ro.observe(document.body);
  }
})();
</script>
`

function buildSrcdoc(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>* { box-sizing: border-box; } body { margin: 0; padding: 0; }</style>
</head>
<body>
${html}
${SELECTION_HANDLER_SCRIPT}
</body>
</html>`
}

export function IframeSandbox({ html, onMessage, className, selectedLoc }: IframeSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'resize' && iframeRef.current) {
        iframeRef.current.style.height = `${String(event.data.height)}px`
      }
      onMessage?.(event)
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onMessage])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return
    iframe.contentWindow.postMessage({ type: 'set-selected', loc: selectedLoc ?? null }, '*')
  }, [selectedLoc])

  return (
    <iframe
      ref={iframeRef}
      srcDoc={buildSrcdoc(html)}
      sandbox="allow-scripts allow-same-origin"
      className={className}
      style={{ width: '100%', border: 'none', display: 'block' }}
      title="Liquid template preview"
    />
  )
}
