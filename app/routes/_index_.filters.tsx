import type { Movie } from '@prisma/client'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import {
  Form,
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useSearchParams,
  useSubmit,
} from '@remix-run/react'
import { useEffect, useState } from 'react'
import { CUSTOM_TAG_LABELS, DATE_FILTER, DATE_FILTER_LABELS } from '../filters'
import { getFilters, getWhereInputs } from '../filters.server'
import { prisma } from '../prisma.server'
import { Icon } from '../ui/icon'
import { Input } from '../ui/input'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const now = new Date()
  const filters = getFilters(request)
  const where = getWhereInputs(filters)

  let results = await prisma.movie.findMany({
    where: {
      ...where.movieWhereInput,
      Showtimes: {
        some: {
          ...where.showtimeWhereInput,
        },
      },
    },
    select: {
      id: true,
      Showtimes: {
        select: {
          id: true,
        },
      },
    },
  })

  return json({
    dates: (Object.keys(DATE_FILTER_LABELS) as Array<keyof typeof DATE_FILTER_LABELS>).map(
      (value) => ({
        value,
        label: DATE_FILTER_LABELS[value],
      }),
    ),

    movieTags: (
      await prisma.movieTag.findMany({
        where: {
          isFilterEnabled: true,
          Movies: { some: { Showtimes: { some: { date: { gte: now } } } } },
        },
        select: { id: true, name: true, Movies: { select: { id: true } } },
      })
    ).map((tag) => ({
      ...tag,
      count: tag.Movies.length,
    })),

    showtimeTags: (
      await prisma.showtimeTag.findMany({
        where: {
          isFilterEnabled: true,
          Showtimes: { some: { date: { gte: now } } },
        },
        select: {
          id: true,
          name: true,
          Showtimes: { select: { movieId: true } },
        },
      })
    ).map((tag) => ({
      ...tag,
      count: tag.Showtimes.reduce<Movie['id'][]>((acc, { movieId }) => {
        if (!acc.includes(movieId)) {
          acc.push(movieId)
        }
        return acc
      }, []).length,
    })),

    customTags: (Object.keys(CUSTOM_TAG_LABELS) as Array<keyof typeof CUSTOM_TAG_LABELS>).map(
      (id) => ({
        id,
        name: CUSTOM_TAG_LABELS[id],
      }),
    ),

    theaters: await prisma.theater.findMany({
      where: { Showtimes: { some: { date: { gte: now } } } },
      select: { id: true, name: true },
    }),

    randomMovie: (await prisma.movie.findFirst({
      select: { title: true },
      where: {
        Showtimes: {
          some: { date: { gte: now } },
        },
      },
    })) || { title: 'Perfect Blue' },

    resultCount: results.length,

    filterCount: filters.count,
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
        <div className="icon border rounded-md border-white border-opacity-20">
          <Icon id="check" width="20px" height="20px" className="opacity-0 fill-white" />
        </div>

        <div className="label pl-3 flex-grow">{label}</div>
      </label>
    </li>
  )
}

export default function Index() {
  const {
    resultCount,
    movieTags,
    showtimeTags,
    customTags,
    theaters,
    randomMovie,
    dates,
    filterCount,
  } = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const [searchParams] = useSearchParams()
  const navigation = useNavigation()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function handleKeyup(event: KeyboardEvent) {
      if (
        !event.defaultPrevented &&
        !['input', 'textarea'].includes(
          (event.target as HTMLElement).tagName.toLocaleLowerCase(),
        ) &&
        event.key === 'Escape'
      ) {
        event.preventDefault()
        navigate(-1)
      }
    }

    document.addEventListener('keyup', handleKeyup)

    return () => document.removeEventListener('keyup', handleKeyup)
  }, [navigate])

  const optimisticSearchParams =
    navigation.state == 'loading' && navigation.location.pathname === location.pathname
      ? new URLSearchParams(navigation.location.search)
      : searchParams

  const searchParamTitle = optimisticSearchParams.get('title') ?? ''
  const searchParamDate = optimisticSearchParams.get('date') ?? DATE_FILTER.DEFAULT
  const searchParamMovieTags = optimisticSearchParams.getAll('movieTags') ?? ''
  const searchParamShowtimeTags = optimisticSearchParams.getAll('showtimeTags') ?? ''
  const searchParamCustomTags = optimisticSearchParams.getAll('customTags') ?? ''
  const searchParamTheaters = optimisticSearchParams.getAll('theaters') ?? ''

  const [searchedTitle, setTitle] = useState(searchParamTitle)
  const [selectedDate, setDate] = useState(searchParamDate)
  const [selectedMovieTags, setMovieTags] = useState(searchParamMovieTags)
  const [selectedShowtimeTags, setShowtimeTags] = useState(searchParamShowtimeTags)
  const [selectedCustomTags, setCustomTags] = useState(searchParamCustomTags)
  const [selectedTheaters, setTheaters] = useState(searchParamTheaters)

  useEffect(() => {
    setTitle(searchParamTitle ?? '')
  }, [searchParamTitle])

  useEffect(() => {
    setDate(searchParamDate ?? '')
  }, [searchParamDate])

  useEffect(() => {
    setMovieTags(selectedMovieTags ?? [])
  }, [selectedMovieTags])

  useEffect(() => {
    setShowtimeTags(selectedShowtimeTags ?? [])
  }, [selectedShowtimeTags])

  useEffect(() => {
    setCustomTags(selectedCustomTags ?? [])
  }, [selectedCustomTags])

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
          <Link to={{ pathname: '/' }} className="fill-white">
            <Icon id="cross-2" width="32px" height="32px" />
          </Link>
          <h1 className="text-center">Filtrer</h1>
          <Link
            style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
            to={{ pathname: location.pathname }}
            className={`w-fit justify-self-end bg-primary rounded-md p-1 pl-2 pr-2 ${
              filterCount ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Effacer
          </Link>
        </div>

        <p className="pt-4">Film</p>
        <Input
          id="title"
          type="text"
          placeholder={`Essayez ${randomMovie.title}`}
          name="title"
          value={searchedTitle}
          onChange={(event) => setTitle(event.target.value)}
          icon={<Icon id="magnifying-glass" />}
        />
        <ul>
          {movieTags.length > 0 &&
            movieTags.map((tag) => (
              <Checkbox
                key={`movieTag-${tag.id.toString()}`}
                id={`movieTag-${tag.id.toString()}`}
                name="movieTags"
                value={tag.id}
                checked={searchParamMovieTags.includes(tag.id.toString())}
                onChange={(event) => setMovieTags([...selectedMovieTags, event.target.value])}
                label={tag.name}
              />
            ))}
        </ul>
        <ul>
          {customTags.length > 0 &&
            customTags.map((tag) => (
              <Checkbox
                key={`customTag-${tag.id.toString()}`}
                id={`customTag-${tag.id.toString()}`}
                name="customTags"
                value={tag.id}
                checked={searchParamCustomTags.includes(tag.id.toString())}
                onChange={(event) => setCustomTags([...selectedCustomTags, event.target.value])}
                label={tag.name}
              />
            ))}
        </ul>

        <p className="pt-4">Séance</p>
        <ul>
          {showtimeTags.length > 0 &&
            showtimeTags.map((tag) => (
              <Checkbox
                key={`showtimeTag-${tag.id.toString()}`}
                id={`showtimeTag-${tag.id.toString()}`}
                name="showtimeTags"
                value={tag.id}
                checked={searchParamShowtimeTags.includes(tag.id.toString())}
                onChange={(event) => setShowtimeTags([...selectedShowtimeTags, event.target.value])}
                label={tag.name}
              />
            ))}
        </ul>
        <ul>
          {dates.length > 0 &&
            dates.map(({ label, value }) => (
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

      <div className="fixed bottom-0 z-5 p-6 w-full max-w-screen-sm m-auto">
        <Link
          style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
          to={{ pathname: '/', search: location.search }}
          className="block rounded-md bg-primary p-4 w-full text-center"
        >
          Montrer {resultCount} film{resultCount > 1 ? 's' : ''}
        </Link>
      </div>
    </Form>
  )
}
