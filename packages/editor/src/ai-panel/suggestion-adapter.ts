export interface SelectedElement {
  loc: string
  tagName: string
  computedStyles: Record<string, string>
  snippet?: string
}

export interface Suggestion {
  prompt: string
  displayLabel: string
}

const GENERAL_SUGGESTIONS: Suggestion[] = [
  { prompt: 'Generate a new section', displayLabel: 'Generate a new section' },
  { prompt: 'Change the overall layout', displayLabel: 'Change the overall layout' },
  { prompt: 'Add a header', displayLabel: 'Add a header' },
  { prompt: 'Improve typography', displayLabel: 'Improve typography' },
]

const BLOCK_ELEMENTS = new Set([
  'div', 'section', 'article', 'main', 'header', 'footer',
  'nav', 'aside', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'figure', 'blockquote', 'form', 'table',
])

export function generateSuggestions(selectedElement: SelectedElement | null): Suggestion[] {
  if (!selectedElement) return GENERAL_SUGGESTIONS

  const { tagName, computedStyles } = selectedElement
  const suggestions: Suggestion[] = []

  suggestions.push({ prompt: 'Adjust spacing', displayLabel: 'Adjust spacing' })
  suggestions.push({ prompt: 'Change colors', displayLabel: 'Change colors' })

  if (computedStyles['font-size'] !== undefined || computedStyles['color'] !== undefined) {
    suggestions.push({ prompt: 'Change typography', displayLabel: 'Change typography' })
  }

  if (tagName === 'img' || computedStyles['background-image'] !== undefined) {
    suggestions.push({ prompt: 'Update image', displayLabel: 'Update image' })
  }

  if (BLOCK_ELEMENTS.has(tagName)) {
    suggestions.push({ prompt: 'Add content below', displayLabel: 'Add content below' })
    suggestions.push({ prompt: 'Wrap in container', displayLabel: 'Wrap in container' })
  }

  if (tagName === 'a' || tagName === 'button') {
    suggestions.push({ prompt: 'Update link text', displayLabel: 'Update link text' })
    suggestions.push({ prompt: 'Style the button', displayLabel: 'Style the button' })
  }

  return suggestions.slice(0, 6)
}
