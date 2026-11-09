import { useState, type ComponentProps } from 'react'

type ProgressiveImgProps = Omit<ComponentProps<'img'>, 'className'> & {
  /** Classes of the frame: size, margins, rounding */
  className?: string
  srcLowDef: string
}

/**
 * Shows the blurred blurhash placeholder, then fades the poster in once it has
 * fully loaded, instead of letting the browser paint it bit by bit.
 * The placeholder is a layer of its own because a CSS blur on the image would
 * blur the poster too.
 */
export function ProgressiveImg({ srcLowDef, className = '', alt, ...rest }: ProgressiveImgProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {srcLowDef && (
        <div
          aria-hidden
          // 40px blur like the original backdrop-blur-2xl, scaled up so it does not fade the edges
          className="absolute inset-0 scale-125 bg-cover bg-center blur-2xl"
          style={{ backgroundImage: `url('${srcLowDef}')` }}
        />
      )}
      <img
        {...rest}
        alt={alt}
        // An image that finished loading before hydration fires no load event: check on mount
        ref={(img) => {
          if (img?.complete) setLoaded(true)
        }}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity ${loaded ? '' : 'opacity-0'}`}
      />
      {/* Without JavaScript the image would stay hidden */}
      <noscript>
        <img {...rest} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      </noscript>
    </div>
  )
}
