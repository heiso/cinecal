import { blurhashToDataUri } from '@unpic/placeholder'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

export const LOW_DEF_IMAGE_WIDTH = 5
export const POSTER_RATIO = 62 / 85
export const POSTER_RATIO_STRING = '62-85'

const isServer = typeof document === 'undefined'

type PosterProps = React.HTMLAttributes<HTMLDivElement> & {
  url: string
  blurHash: string | null
  width: number
  height?: number
  alt: string
  movieId: number
}

export function Poster({ movieId, url, blurHash, width, height, alt, ...rest }: PosterProps) {
  const srcLowDef = useMemo<string>(() => {
    if (!blurHash) {
      return ``
    }

    return blurhashToDataUri(
      blurHash,
      LOW_DEF_IMAGE_WIDTH,
      Math.round(LOW_DEF_IMAGE_WIDTH / POSTER_RATIO)
    )
  }, [blurHash])

  const src = `${url}/tr:w-${width},ar-${POSTER_RATIO_STRING}`

  const id = useId()

  const [isVisible, setVisible] = useState(() => {
    if (isServer) return false

    // on the client, it's possible the images has already finished loading.
    // we've got the data-evt-onload attribute on the image
    // (which our entry.server replaces with simply "onload") which will remove
    // the class "opacity-0" from the image once it's loaded. So we'll check
    // if the image is already loaded and if so, we know that visible should
    // initialize to true.
    const el = document.getElementById(id)
    return el instanceof HTMLImageElement && el.complete
  })

  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (ref.current.complete) return

    let current = true
    ref.current.addEventListener('load', () => {
      if (!ref.current || !current) return
      setTimeout(() => {
        setVisible(true)
      }, 0)
    })

    return () => {
      current = false
    }
  }, [])

  return (
    <div {...rest} className="relative w-full overflow-hidden aspect-[62/85]">
      <img className="absolute" src={srcLowDef} width="100%" alt={alt} />
      <div className="absolute backdrop-blur-2xl h-full w-full"></div>
      <img
        // See https://github.com/kentcdodds/kentcdodds.com/commit/54d11cefd15ece5a3ff0f1ab7233dfe2422fead8
        // React doesn't like the extra onload prop the server's going to send,
        // but it also doesn't like an onload prop and recommends onLoad instead.
        // but we want to use the onload prop because it's a bit more performant
        // and as a result it's possible the user will never see the blurred image
        // at all which would be great. So we suppress the warning here and we use
        // this funny data-evt-prefixed attribute which our server renderer will
        // remove for us (check entry.server).
        suppressHydrationWarning={true}
        data-evt-onload="this.classList.remove('opacity-0')"
        onLoad={() => setVisible(true)}
        id={id}
        className={`absolute left-0 top-0 transition-opacity ${isVisible ? '' : 'opacity-0'} `}
        src={src}
        alt={alt}
        ref={ref}
        loading="lazy"
        width="100%"
      />
      <noscript>
        <img className="absolute" src={src} alt={alt} loading="lazy" width="100%" />
      </noscript>
    </div>
  )
}
