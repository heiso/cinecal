import type { InputHTMLAttributes, ReactNode } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean
  icon?: ReactNode
}

const defaultStyles =
  'text-white placeholder:text-white/50 hover:border-white/30 focus:border-white/30 border-white/20 bg-white/10'
const errorStyles =
  'text-red-500 placeholder:text-red-300 hover:border-red-500 focus:border-red-500 bg-red-100 selection:bg-red-500 selection:text-red-50'

export function Input({ hasError, className, icon, ...props }: InputProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <input
        className={`block h-full w-full p-3 px-4 ${
          icon ? 'pr-11' : ''
        } focus-active:ring-0 appearance-none rounded-md border ring-0 outline-hidden focus:ring-0 disabled:pointer-events-none ${
          hasError ? errorStyles : defaultStyles
        }`}
        {...props}
      />
      {icon && (
        <div
          className={`absolute top-0 right-0 bottom-0 z-10 px-4 py-3 select-none ${
            hasError ? 'fill-red-500 text-red-500' : 'fill-white text-white'
          } flex items-center justify-center`}
        >
          {icon}
        </div>
      )}
    </div>
  )
}
