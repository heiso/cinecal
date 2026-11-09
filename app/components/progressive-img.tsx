import type { ComponentProps } from 'react'

type ProgressiveImgProps = ComponentProps<'img'> & {
  srcLowDef: string
}

/**
 * The blurhash placeholder is the image's background, so it shows until the
 * poster has loaded, without JavaScript.
 * https://github.com/ascorbic/unpic-placeholder#blurhash
 */
export function ProgressiveImg({ srcLowDef, style, alt, ...rest }: ProgressiveImgProps) {
  return (
    <img
      {...rest}
      alt={alt}
      style={
        srcLowDef
          ? { backgroundImage: `url('${srcLowDef}')`, backgroundSize: 'cover', ...style }
          : style
      }
    />
  )
}
