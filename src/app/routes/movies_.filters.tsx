import CheckIcon from '@heroicons/react/20/solid/CheckIcon'
import BackIcon from '@heroicons/react/20/solid/XMarkIcon'
import { Prisma } from '@prisma/client'
import { LoaderArgs, json } from '@remix-run/node'
import {
  Form,
  Link,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
  useSubmit,
} from '@remix-run/react'
import { add, endOfDay, endOfWeek, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { Context } from '../../core/context'
import { DATE_FILTER } from './movies'

export const loader = async ({ context, params, request }: LoaderArgs) => {
  const ctx = context as unknown as Context

  const url = new URL(request.url)
  const search = new URLSearchParams(url.search)
  const filters = {
    title: search.get('title'),
    date: search.get('date'),
    tags: search.getAll('tags').map((id) => parseInt(id)),
    theaters: search.getAll('theaters').map((id) => parseInt(id)),
  }

  if (
    (filters.date && !DATE_FILTER[filters.date as DATE_FILTER]) ||
    (filters.theaters && filters.theaters.some((id) => isNaN(Number(id))))
  ) {
    throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
  }

  const now = new Date()

  const dateFilter: Prisma.ShowtimeWhereInput = (() => {
    switch (filters.date) {
      case DATE_FILTER.TODAY: {
        return { date: { gte: now, lt: endOfDay(now) } }
      }

      case DATE_FILTER.THIS_WEEK: {
        return { date: { gte: now, lt: endOfWeek(now, { locale: fr }) } }
      }

      case DATE_FILTER.NEXT_WEEK: {
        return {
          date: {
            gt: startOfWeek(add(now, { weeks: 1 }), { locale: fr }),
            lte: endOfWeek(add(now, { weeks: 1 }), { locale: fr }),
          },
        }
      }

      case DATE_FILTER.DEFAULT:
      default: {
        return { date: { gte: now } }
      }
    }
  })()

  const resultCount = await ctx.prisma.movie.count({
    where: {
      ...(filters.title && { title: { contains: filters.title, mode: 'insensitive' } }),
      Showtimes: {
        some: {
          ...dateFilter,
          ...(filters.theaters.length > 0 && {
            theaterId: { in: filters.theaters },
          }),
          ...(filters.tags.length > 0 && {
            Tags: {
              some: { id: { in: filters.tags } },
            },
          }),
        },
      },
    },
  })

  return json({
    tags: await ctx.prisma.tag.findMany({
      where: { Showtimes: { some: { date: { gte: now } } } },
      select: { id: true, name: true },
    }),

    theaters: await ctx.prisma.theater.findMany({
      where: { Showtimes: { some: { date: { gte: now } } } },
      select: { id: true, name: true },
    }),

    randomMovie: (await ctx.prisma.movie.findFirst({
      select: { title: true },
      where: {
        Showtimes: {
          some: { date: { gte: now } },
        },
      },
    })) || { title: 'Perfect Blue' },

    resultCount,
  })
}

type RadioProps = React.ComponentProps<'input'> & { label: string }

function Radio({ id, label, ...rest }: RadioProps) {
  return (
    <li className="mt-4 mb-4">
      <input id={id} className="peer hidden" type="radio" {...rest} />
      <label
        className="flex flex-row items-center p-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-md peer-checked:border-primary peer-checked:border-opacity-20 peer-checked:bg-primary peer-checked:bg-opacity-10 peer-checked:[&_.icon]:bg-primary peer-checked:[&_.icon_div]:opacity-100 cursor-pointer"
        htmlFor={id}
      >
        <div className="icon border rounded-full border-white border-opacity-20 aspect-square h-5 p-1.5">
          <div className="aspect-square h-full w-full bg-white rounded-full opacity-0"></div>
        </div>

        <div className="label pl-3 flex-grow">{label}</div>
      </label>
    </li>
  )
}

type CheckboxProps = React.ComponentProps<'input'> & { label: string }

function Checkbox({ id, name, value, label, defaultChecked, ...rest }: CheckboxProps) {
  return (
    <li className="mt-4 mb-4">
      <input
        id={id}
        className="peer hidden"
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        {...rest}
      />
      <label
        className="flex flex-row items-center p-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-md peer-checked:border-primary peer-checked:border-opacity-20 peer-checked:bg-primary peer-checked:bg-opacity-10 peer-checked:[&_.icon]:bg-primary peer-checked:[&_.icon_svg]:opacity-100 cursor-pointer"
        htmlFor={id}
      >
        <div className="icon border rounded-md border-white border-opacity-20 aspect-square">
          <CheckIcon className="h-5 opacity-0" />
        </div>

        <div className="label pl-3 flex-grow">{label}</div>
      </label>
    </li>
  )
}

export default function Index() {
  const { resultCount, tags, theaters, randomMovie } = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const [searchParams] = useSearchParams()
  const navigation = useNavigation()
  const location = useLocation()

  const optimisticSearchParams =
    navigation.state == 'loading' && navigation.location.pathname === location.pathname
      ? new URLSearchParams(navigation.location.search)
      : searchParams

  const searchParamTitle = optimisticSearchParams.get('title') ?? ''
  const searchParamDate = optimisticSearchParams.get('date') || DATE_FILTER.DEFAULT
  const searchParamTags = optimisticSearchParams.getAll('tags') ?? ''
  const searchParamTheaters = optimisticSearchParams.getAll('theaters') ?? ''

  const [searchedTitle, setTitle] = useState(searchParamTitle)
  const [selectedDate, setDate] = useState(searchParamDate)
  const [selectedTags, setTags] = useState(searchParamTags)
  const [selectedTheaters, setTheaters] = useState(searchParamTheaters)

  useEffect(() => {
    setTitle(searchParamTitle ?? '')
  }, [searchParamTitle])

  useEffect(() => {
    setDate(searchParamDate || DATE_FILTER.DEFAULT)
  }, [searchParamDate])

  useEffect(() => {
    setTags(selectedTags ?? [])
  }, [selectedTags])

  useEffect(() => {
    setTheaters(selectedTheaters ?? [])
  }, [selectedTheaters])

  return (
    <Form
      preventScrollReset
      method="get"
      onChange={(event) => submit(event.currentTarget, { method: 'get', preventScrollReset: true })}
    >
      <div className="p-6 pb-28">
        <div className="grid grid-flow-col grid-cols-3 items-center">
          <Link to={{ pathname: '/movies' }} className="w-fit">
            <BackIcon className="h-8" />
          </Link>
          <h1 className="text-center">Filtrer</h1>
          <Link
            to={{ pathname: location.pathname }}
            className={`w-fit justify-self-end bg-primary rounded-md p-1 pl-2 pr-2 ${
              location.search ? 'block' : 'hidden'
            }`}
          >
            Effacer
          </Link>
        </div>

        <p className="pt-4">Titre</p>
        <input
          className="mt-4 mb-4 appearance-none block text-white bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg w-full p-3 pl-4 pr-4 ring-0 focus:ring-0 focus-active:ring-0
          outline-none"
          type="text"
          placeholder={`Essayez ${randomMovie.title}`}
          name="title"
          value={searchedTitle}
          onChange={(event) => setTitle(event.target.value)}
        />

        <p className="pt-4">Date</p>
        <ul>
          {[
            { label: 'Peu importe', value: DATE_FILTER.DEFAULT },
            { label: "Aujourd'hui", value: DATE_FILTER.TODAY },
            { label: 'Cette semaine', value: DATE_FILTER.THIS_WEEK },
            { label: 'Semaine prochaine', value: DATE_FILTER.NEXT_WEEK },
          ].map(({ label, value }) => (
            <Radio
              key={`date-${value}`}
              id={`date-${value}`}
              name="date"
              value={value}
              checked={selectedDate === value}
              onChange={(event) => setDate(event.target.value)}
              label={label}
            />
          ))}
        </ul>

        <p className="pt-4">Tags</p>
        <ul>
          {tags.length > 0 &&
            tags.map((tag) => (
              <Checkbox
                key={`tag-${tag.id.toString()}`}
                id={`tag-${tag.id.toString()}`}
                name="tags"
                value={tag.id}
                checked={searchParamTags.includes(tag.id.toString())}
                onChange={(event) => setTags([...selectedTags, event.target.value])}
                label={tag.name}
              />
            ))}
        </ul>

        <p className="pt-4">Cinémas</p>
        <ul>
          {theaters.length > 0 &&
            theaters.map((theater) => (
              <Checkbox
                key={`theater-${theater.id.toString()}`}
                id={`theater-${theater.id.toString()}`}
                name="theaters"
                value={theater.id}
                checked={searchParamTheaters.includes(theater.id.toString())}
                onChange={(event) => setTheaters([...selectedTheaters, event.target.value])}
                label={theater.name}
              />
            ))}
        </ul>
      </div>

      <div className="fixed bottom-0 z-5 p-6 w-full xl:w-4/6">
        <Link
          to={{ pathname: '/movies', search: location.search }}
          className="block rounded-md bg-primary p-4 w-full text-center"
        >
          Montrer {resultCount} film{resultCount > 1 ? 's' : ''}
        </Link>
      </div>
    </Form>
  )
}
