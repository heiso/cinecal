import { LoaderArgs, redirect } from '@remix-run/node'
import { Context } from '../../core/context'

export const loader = async ({ context }: LoaderArgs) => {
  const ctx = context as unknown as Context

  throw redirect('/list/featured')
}
