import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/icon'

type ShareButtonProps = {
  /** Classes of the wrapper: spacing */
  className?: string
  title: string
  url: string
}

const COPIED_FEEDBACK_MS = 2000

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Opens the native share sheet, or copies the link where there is none.
 * Only shown on touch devices: there is no share button on desktop.
 */
export function ShareButton({ className = '', title, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(copiedTimeoutRef.current), [])

  async function handleClick() {
    const data = { title, url }

    if (navigator.canShare?.(data)) {
      try {
        await navigator.share(data)
        return
      } catch (error) {
        // Closing the share sheet rejects too
        if (isAbortError(error)) return
        // Any other failure falls back to copying the link
        console.error(error)
      }
    }

    try {
      await navigator.clipboard.writeText(url)
    } catch (error) {
      console.error(error)
      return
    }

    setCopied(true)
    clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
  }

  return (
    <span className={`hidden pointer-coarse:inline ${className}`}>
      <button
        type="button"
        aria-label="Partager"
        // A flex box is exactly the icon's height, without the line height around it
        className="inline-flex fill-primary align-middle"
        onClick={handleClick}
      >
        <Icon id={copied ? 'check' : 'share-1'} width="24px" height="24px" />
      </button>
      {/* Announced by screen readers when it changes */}
      <output className="sr-only">{copied ? 'Lien copié' : ''}</output>
    </span>
  )
}
