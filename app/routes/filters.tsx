import { useEffect, useState, type ComponentProps } from 'react'
import {
  data,
  Form,
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
  useSubmit,
} from 'react-router'
import { db } from '../db.server'
import { AFTER_WORK_LABEL, CUSTOM_TAG_LABELS, DATE_FILTER, DATE_FILTER_LABELS } from '../filters'
import { getFilters, getWhereInputs } from '../filters.server'
import { saveFilters } from '../saved-filters.server'
import { Icon } from '../ui/icon'
import { Input } from '../ui/input'
import type { Route } from './+types/filters'

export async function loader({ request }: Route.LoaderArgs) {
  const now = new Date()
  const filters = getFilters(request)
  const where = getWhereInputs(filters)

  const [results, movieTags, showtimeTags, theaters, randomMovie] = await Promise.all([
    db.orm.public.Movie.where(where.movie).aggregate((aggregate) => ({ count: aggregate.count() })),
    db.orm.public.MovieTag.where((tag) => tag.isFilterEnabled.eq(true))
      .where((tag) =>
        tag.Movies.some((movie) => movie.Showtimes.some((showtime) => showtime.date.gte(now))),
      )
      .select('id', 'name')
      .orderBy((tag) => tag.id.asc())
      .all(),
    db.orm.public.ShowtimeTag.where((tag) => tag.isFilterEnabled.eq(true))
      .where((tag) => tag.Showtimes.some((showtime) => showtime.date.gte(now)))
      .select('id', 'name')
      .orderBy((tag) => tag.id.asc())
      .all(),
    db.orm.public.Theater.where((theater) =>
      theater.Showtimes.some((showtime) => showtime.date.gte(now)),
    )
      .select('id', 'name')
      .orderBy((theater) => theater.id.asc())
      .all(),
    db.orm.public.Movie.where((movie) => movie.Showtimes.some((showtime) => showtime.date.gte(now)))
      .select('title')
      .first(),
  ])

  const body = {
    dates: Object.values(DATE_FILTER).map((value) => ({ value, label: DATE_FILTER_LABELS[value] })),
    movieTags,
    showtimeTags,
    customTags: (Object.keys(CUSTOM_TAG_LABELS) as Array<keyof typeof CUSTOM_TAG_LABELS>).map(
      (id) => ({ id, name: CUSTOM_TAG_LABELS[id] }),
    ),
    theaters,
    randomMovie: randomMovie ?? { title: 'Perfect Blue' },
    resultCount: results.count,
    filterCount: filters.count,
  }

  return data(body, { headers: { 'Set-Cookie': await saveFilters(filters) } })
}

function getFormValues(searchParams: URLSearchParams) {
  return {
    title: searchParams.get('title') ?? '',
    date: searchParams.get('date') ?? DATE_FILTER.DEFAULT,
    movieTags: searchParams.getAll('movieTags'),
    showtimeTags: searchParams.getAll('showtimeTags'),
    customTags: searchParams.getAll('customTags'),
    theaters: searchParams.getAll('theaters'),
    afterWork: searchParams.has('afterWork'),
  }
}

type FormValues = ReturnType<typeof getFormValues>
type ListField = 'movieTags' | 'showtimeTags' | 'customTags' | 'theaters'

type RadioProps = ComponentProps<'input'> & { label: string }

function Radio({ id, label, ...rest }: RadioProps) {
  return (
    <li className="mt-4 mb-4">
      <input id={id} className="peer hidden" type="radio" {...rest} />
      <label
        className="flex cursor-pointer flex-row items-center rounded-md border border-white/20 bg-white/10 p-3 peer-checked:border-primary/20 peer-checked:bg-primary/10 peer-checked:[&_.icon]:bg-primary peer-checked:[&_.icon_div]:opacity-100"
        htmlFor={id}
      >
        <div className="icon aspect-square h-5 rounded-full border border-white/20 p-1.5">
          <div className="aspect-square h-full w-full rounded-full bg-white opacity-0"></div>
        </div>

        <div className="label grow pl-3">{label}</div>
      </label>
    </li>
  )
}

type CheckboxProps = ComponentProps<'input'> & { label: string }

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
        className="flex cursor-pointer flex-row items-center rounded-md border border-white/20 bg-white/10 p-3 peer-checked:border-primary/20 peer-checked:bg-primary/10 peer-checked:[&_.icon]:bg-primary peer-checked:[&_.icon_svg]:opacity-100"
        htmlFor={id}
      >
        <div className="icon rounded-md border border-white/20">
          <Icon id="check" width="20px" height="20px" className="fill-white opacity-0" />
        </div>

        <div className="label grow pl-3">{label}</div>
      </label>
    </li>
  )
}

export default function Filters({ loaderData }: Route.ComponentProps) {
  const {
    resultCount,
    movieTags,
    showtimeTags,
    customTags,
    theaters,
    randomMovie,
    dates,
    filterCount,
  } = loaderData
  const submit = useSubmit()
  const [searchParams] = useSearchParams()
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

  // The inputs are controlled so typing stays responsive while the form submits on each change.
  // When the URL changes from outside the form (back/forward, "Effacer"), the inputs follow it:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const search = searchParams.toString()
  const [values, setValues] = useState(() => getFormValues(searchParams))
  const [previousSearch, setPreviousSearch] = useState(search)
  if (search !== previousSearch) {
    setPreviousSearch(search)
    setValues(getFormValues(searchParams))
  }

  function setValue<Field extends keyof FormValues>(field: Field, value: FormValues[Field]) {
    setValues((values) => ({ ...values, [field]: value }))
  }

  function toggle(field: ListField, value: string, checked: boolean) {
    setValues((values) => ({
      ...values,
      [field]: checked ? [...values[field], value] : values[field].filter((item) => item !== value),
    }))
  }

  return (
    <Form
      preventScrollReset
      method="get"
      onChange={(event) => submit(event.currentTarget, { method: 'get', preventScrollReset: true })}
    >
      <title>Cinecal</title>
      <div className="p-6 pb-28">
        <div className="grid grid-flow-col grid-cols-3 items-center">
          <Link to={{ pathname: '/' }} className="fill-white">
            <Icon id="cross-2" width="32px" height="32px" />
          </Link>
          <h1 className="text-center">Filtrer</h1>
          <Link
            style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
            to={{ pathname: location.pathname }}
            className={`w-fit justify-self-end rounded-md bg-primary p-1 pr-2 pl-2 ${
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
          value={values.title}
          onChange={(event) => setValue('title', event.target.value)}
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
                checked={values.movieTags.includes(tag.id.toString())}
                onChange={(event) => toggle('movieTags', event.target.value, event.target.checked)}
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
                checked={values.customTags.includes(tag.id.toString())}
                onChange={(event) => toggle('customTags', event.target.value, event.target.checked)}
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
                checked={values.showtimeTags.includes(tag.id.toString())}
                onChange={(event) =>
                  toggle('showtimeTags', event.target.value, event.target.checked)
                }
                label={tag.name}
              />
            ))}
        </ul>
        <ul>
          <Checkbox
            id="afterWork"
            name="afterWork"
            value="on"
            checked={values.afterWork}
            onChange={(event) => setValue('afterWork', event.target.checked)}
            label={AFTER_WORK_LABEL}
          />
        </ul>
        <ul>
          {dates.length > 0 &&
            dates.map(({ label, value }) => (
              <Radio
                key={`date-${value}`}
                id={`date-${value}`}
                name="date"
                value={value}
                checked={values.date === value}
                onChange={(event) => setValue('date', event.target.value)}
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
                checked={values.theaters.includes(theater.id.toString())}
                onChange={(event) => toggle('theaters', event.target.value, event.target.checked)}
                label={theater.name}
              />
            ))}
        </ul>
      </div>

      <div className="fixed bottom-0 z-5 m-auto w-full max-w-(--breakpoint-sm) p-6">
        <Link
          style={{ textShadow: '0 0 1px rgba(0,0,0,.5)' }}
          to={{ pathname: '/', search: location.search }}
          className="block w-full rounded-md bg-primary p-4 text-center"
        >
          Montrer {resultCount} film{resultCount > 1 ? 's' : ''}
        </Link>
      </div>
    </Form>
  )
}
