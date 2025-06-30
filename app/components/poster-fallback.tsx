type PosterFalbackProps = {
  title: string
}

export function PosterFalback({ title }: PosterFalbackProps) {
  return (
    <div className="flex items-center justify-center w-full h-full aspect-poster rounded-xl bg-[#161d26] p-2">
      <div
        style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
        className="font-semibold text-lg text-white text-center"
      >
        {title}
      </div>
    </div>
  )
}
