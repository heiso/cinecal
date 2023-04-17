import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { getPixels } from '@unpic/pixels'
import { blurhashToDataUri } from '@unpic/placeholder'
import { encode } from 'blurhash'
import { IMAGEKIT_URL, POSTER_RATIO, POSTER_RATIO_STRING } from '../poster'

const LOW_DEF_IMAGE_WIDTH = 10
const ID = 10

export const loader = async () => {
  const url = `${IMAGEKIT_URL}/${ID}/tr:w-500,q-50,ar-${POSTER_RATIO_STRING}`
  const pixels = await getPixels(url)
  const data = Uint8ClampedArray.from(pixels.data)

  const blurHash = encode(data, pixels.width, pixels.height, Math.round(9 * POSTER_RATIO), 9)
  const uri = blurhashToDataUri(
    blurHash,
    LOW_DEF_IMAGE_WIDTH,
    Math.round(LOW_DEF_IMAGE_WIDTH / POSTER_RATIO)
  )

  const blurHash2 = encode(data, pixels.width, pixels.height, Math.round(3 * POSTER_RATIO), 3)
  const uri2 = blurhashToDataUri(
    blurHash2,
    LOW_DEF_IMAGE_WIDTH,
    Math.round(LOW_DEF_IMAGE_WIDTH / POSTER_RATIO)
  )

  const url2 = `${IMAGEKIT_URL}/${ID}/tr:w-${LOW_DEF_IMAGE_WIDTH},ar-${POSTER_RATIO_STRING}`
  const res = await fetch(url2)
  const mime = res.headers.get('content-type')
  const buffer = await res.arrayBuffer()
  const base64 = `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`

  return json({
    uri,
    blurHash2,
    uri2,
    base64,
  })
}

export default function BlurHashTest() {
  const { uri, blurHash2, uri2, base64 } = useLoaderData<typeof loader>()
  const uri3 = blurhashToDataUri(
    blurHash2,
    LOW_DEF_IMAGE_WIDTH,
    Math.round(LOW_DEF_IMAGE_WIDTH / POSTER_RATIO)
  )

  return (
    <>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden">
        <img src={`${IMAGEKIT_URL}/${ID}/tr:w-500,ar-${POSTER_RATIO_STRING}`} />
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden">
        <img src={`${IMAGEKIT_URL}/${ID}/tr:w-500,ar-${POSTER_RATIO_STRING},q-1`} />
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden">
        <img src={`${IMAGEKIT_URL}/${ID}/tr:w-500,ar-${POSTER_RATIO_STRING},bl-50`} />
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden">
        <img src={`${IMAGEKIT_URL}/${ID}/tr:w-500,ar-${POSTER_RATIO_STRING},q-1,bl-50`} />
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden">
        <img
          src={`${IMAGEKIT_URL}/${ID}/tr:w-${LOW_DEF_IMAGE_WIDTH},ar-${POSTER_RATIO_STRING},bl-1`}
          width="100%"
        />
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden">
        <img src={uri} width="100%" />
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden">
        <img src={uri2} width="100%" />
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden relative">
        <img className="absolute" src={uri} width="100%" />
        <div className="absolute backdrop-blur-2xl h-full w-full"></div>
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden relative">
        <img
          className="absolute"
          src={`${IMAGEKIT_URL}/${ID}/tr:w-${LOW_DEF_IMAGE_WIDTH},ar-${POSTER_RATIO_STRING}`}
          width="100%"
        />
        <div className="absolute backdrop-blur-2xl h-full w-full"></div>
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden relative">
        <img className="absolute" src={base64} width="100%" />
        <div className="absolute backdrop-blur-2xl h-full w-full"></div>
      </div>
      <div className="w-1/4 m-1 aspect-[62/85] float-left overflow-hidden relative">
        <img className="absolute" src={uri3} width="100%" />
        <div className="absolute backdrop-blur-2xl h-full w-full"></div>
      </div>
    </>
  )
}
