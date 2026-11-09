type PosterFalbackProps = {
  title: string
}

export function PosterFalback({ title }: PosterFalbackProps) {
  return (
    <div className="flex aspect-poster h-full w-full items-center justify-center rounded-xl bg-[#161d26] p-2">
      <div
        style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
        className="text-center text-lg font-semibold text-white"
      >
        {title}
      </div>
    </div>
  )
}
