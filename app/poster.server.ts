import { blurhashToDataUri } from '@unpic/placeholder'

export const POSTER_WIDTH = 310
export const LOW_DEF_IMAGE_WIDTH = 5
export const POSTER_RATIO = 62 / 85

const imagekitUrl = `https://ik.imagekit.io/cinecal/${
  process.env.ENV === 'development' ? 'posters-dev' : 'posters-prod'
}`

export function getPosterSrc(posterUrl: string | null, posterBlurHash: string | null) {
  return {
    // TODO: default src
    src: posterUrl ? `${imagekitUrl}/${posterUrl}/tr:w-${POSTER_WIDTH},ar-62-85` : '',
    srcLowDef: posterBlurHash
      ? blurhashToDataUri(
          posterBlurHash,
          LOW_DEF_IMAGE_WIDTH,
          Math.round(LOW_DEF_IMAGE_WIDTH / POSTER_RATIO),
        )
      : '',
  }
}
