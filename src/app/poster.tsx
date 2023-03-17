import { useState } from 'react'
import { BlurredImage } from './blurred-image'

const LOW_DEF_IMAGE_WIDTH = 2

function getCropedPosterUrl(url: string | null, width: number, height: number) {
  if (!url) return '/favicon.ico'
  return url
    .replace('/pictures/', `/c_${width}_${height}/pictures/`)
    .replace('/medias/nmedia/', `/c_${width}_${height}/medias/nmedia/`)
}

type PosterProps = React.HTMLAttributes<HTMLDivElement> & {
  src: string | null
  width: number
  height: number
  alt: string
}

export function Poster({ src, width, height, ...rest }: PosterProps) {
  const [srcLowDefinition] = useState<string>(
    getCropedPosterUrl(src, LOW_DEF_IMAGE_WIDTH, Math.round((LOW_DEF_IMAGE_WIDTH * height) / width))
  )
  const [srcCroped] = useState<string>(getCropedPosterUrl(src, width, height))

  return <BlurredImage {...rest} src={srcCroped} srcLowDefinition={srcLowDefinition} />
}
