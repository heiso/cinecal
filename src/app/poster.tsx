import { useState } from 'react'
import { BlurredImage } from './blurred-image'

const LOW_DEF_IMAGE_WIDTH = 2
const IMAGEKIT_URL = 'https://ik.imagekit.io/cinecal/posters/'

function getCropedPosterUrl(url: string | null, width: number, height: number) {
  if (!url) return '/favicon.ico'
  return url
    .replace('/pictures/', `/c_${width}_${height}/pictures/`)
    .replace('/medias/nmedia/', `/c_${width}_${height}/medias/nmedia/`)
}

type PosterProps = React.HTMLAttributes<HTMLDivElement> & {
  movieId: number
  width: number
  height: number
  alt: string
}

export function Poster({ movieId, width, height, ...rest }: PosterProps) {
  const [lowDefHeight] = useState<number>(Math.round((LOW_DEF_IMAGE_WIDTH * height) / width))
  return (
    <BlurredImage
      {...rest}
      src={`${IMAGEKIT_URL}/tr:w-${width},h-${height}/${movieId}`}
      srcLowDefinition={`${IMAGEKIT_URL}/tr:w-${LOW_DEF_IMAGE_WIDTH},h-${lowDefHeight},bl-100/${movieId}`}
    />
  )
}
