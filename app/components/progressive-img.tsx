import type { ComponentProps } from 'react'

type ProgressiveImgProps = Omit<ComponentProps<'img'>, 'className'> & {
  /** Classes of the frame: size, margins, rounding */
  className?: string
  srcLowDef: string
}

/**
 * The blurred blurhash placeholder sits under the image, so it shows until the
 * poster has loaded, without JavaScript. It is a layer of its own because a CSS
 * blur on the image would blur the poster too.
 */
export function ProgressiveImg({ srcLowDef, className = '', alt, ...rest }: ProgressiveImgProps) {
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
      <img {...rest} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  )
}
