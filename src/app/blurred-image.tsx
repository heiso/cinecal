import { useEffect, useId, useRef, useState } from 'react'

export type BlurredImageProps = React.HTMLAttributes<HTMLDivElement> & {
  src: string
  srcLowDefinition: string
  alt: string
}

const isServer = typeof document === 'undefined'

export function BlurredImage({ src, srcLowDefinition, alt, ...rest }: BlurredImageProps) {
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
    <div
      {...rest}
      className="relative w-full h-full bg-no-repeat bg-cover bg-top overflow-hidden"
      style={{ backgroundImage: `url('${srcLowDefinition}')` }}
    >
      <div className="absolute left-0 top-0 w-full h-full backdrop-blur-2xl"></div>
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
        height="100%"
      />

      <noscript>
        <div className="absolute top-0 left-0 bottom-0 right-0">
          <div className="absolute top-0 left-0 bottom-0 right-0 backdrop-blur-2xl"></div>
          <img width="100%" height="100%" src={srcLowDefinition} loading="eager" />
        </div>
        <img
          className="absolute top-0 left-0 bottom-0 right-0"
          src={src}
          alt={alt}
          loading="lazy"
          width="100%"
          height="100%"
        />
      </noscript>
    </div>
  )
}
