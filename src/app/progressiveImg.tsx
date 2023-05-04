import { useEffect, useId, useRef, useState } from 'react'

const isServer = typeof document === 'undefined'

type ProgressiveImgProps = React.ComponentProps<'img'> & {
  srcLowDef: string
}

export function ProgressiveImg({ srcLowDef, className, ...rest }: ProgressiveImgProps) {
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
    <div className={className} style={{ position: 'relative' }}>
      <img className="absolute" src={srcLowDef} width="100%" alt="blured image" />
      <div className="absolute backdrop-blur-2xl h-full w-full"></div>
      <img
        {...rest}
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
        ref={ref}
        width="100%"
      />
      <noscript>
        <img className="absolute" width="100%" {...rest} />
      </noscript>
    </div>
  )
}
