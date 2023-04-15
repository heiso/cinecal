import { useState } from 'react'
import { BlurredImage } from './blurred-image'

const LOW_DEF_IMAGE_WIDTH = 5

type PosterProps = React.HTMLAttributes<HTMLDivElement> & {
  url: string
  width: number
  height: number
  alt: string
}

export function Poster({ url, width, height, ...rest }: PosterProps) {
  const [lowDefHeight] = useState<number>(Math.round((LOW_DEF_IMAGE_WIDTH * height) / width))

  return (
    <BlurredImage
      {...rest}
      src={`${url}/tr:w-${width},h-${height}`}
      srcLowDefinition={`${url}/tr:w-${LOW_DEF_IMAGE_WIDTH},h-${lowDefHeight}`}
    />
  )
}
