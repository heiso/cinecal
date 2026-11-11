import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/icon'
import { ProgressiveImg } from './progressive-img'

type PosterZoomProps = {
  /** Classes of the thumbnail: size, margins, stacking */
  className?: string
  src: string
  srcLowDef: string
  srcFullSize: string
  alt: string
}

/**
 * The poster thumbnail, which opens the full size poster in a modal dialog.
 * A click anywhere or Escape closes it.
 */
export function PosterZoom({ className = '', src, srcLowDef, srcFullSize, alt }: PosterZoomProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // The full size poster is only downloaded once asked for
  const [requested, setRequested] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // The dialog closes on the Escape keydown, while the movie page leaves on the Escape keyup:
    // mark that keyup as handled, before it reaches the page's listener on document
    let isClosingOnEscape = false

    function handleKeydown(event: KeyboardEvent) {
      isClosingOnEscape = event.key === 'Escape' && Boolean(dialogRef.current?.open)
    }

    function handleKeyup(event: KeyboardEvent) {
      if (event.key === 'Escape' && isClosingOnEscape) {
        isClosingOnEscape = false
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeydown, { capture: true })
    window.addEventListener('keyup', handleKeyup, { capture: true })

    return () => {
      window.removeEventListener('keydown', handleKeydown, { capture: true })
      window.removeEventListener('keyup', handleKeyup, { capture: true })
    }
  }, [])

  return (
    <>
      <button
        type="button"
        aria-label="Agrandir l'affiche"
        className={`block cursor-zoom-in ${className}`}
        onClick={() => {
          setRequested(true)
          dialogRef.current?.showModal()
        }}
      >
        <ProgressiveImg
          className="aspect-poster w-full rounded-xl"
          src={src}
          srcLowDef={srcLowDef}
          alt={alt}
        />
      </button>

      <dialog
        ref={dialogRef}
        aria-label={alt}
        className="m-0 h-dvh max-h-none w-dvw max-w-none bg-transparent backdrop:bg-black/90"
      >
        {/* Covers the whole dialog: a click anywhere closes it */}
        <button
          type="button"
          aria-label="Fermer"
          className="flex h-full w-full cursor-zoom-out items-center justify-center p-6"
          onClick={() => dialogRef.current?.close()}
        >
          <Icon
            id="cross-2"
            width="32px"
            height="32px"
            className="absolute top-6 left-6 fill-white"
          />
          {requested && (
            <img
              src={srcFullSize}
              alt={alt}
              // An image already in the cache fires no load event: check on mount
              ref={(img) => {
                if (img?.complete) setLoaded(true)
              }}
              onLoad={() => setLoaded(true)}
              className={`max-h-full max-w-full rounded-xl transition-opacity ${loaded ? '' : 'opacity-0'}`}
            />
          )}
        </button>
      </dialog>
    </>
  )
}
