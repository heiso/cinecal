import {
  Form,
  Link,
  useLoaderData,
  useLocation,
  useNavigation,
  useSearchParams,
  useSubmit,
} from '@remix-run/react'
import { useEffect, useState } from 'react'
import { DATE_FILTER, loader as indexLoader } from './movies'

export const loader = indexLoader

export default function Index() {
  const { movies, tags, theaters } = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const [searchParams] = useSearchParams()
  const navigation = useNavigation()
  const location = useLocation()

  const optimisticSearchParams =
    navigation.state == 'loading' && navigation.location.pathname === location.pathname
      ? new URLSearchParams(navigation.location.search)
      : searchParams

  const searchParamTitle = optimisticSearchParams.get('title') ?? ''
  const searchParamDate = optimisticSearchParams.get('date') ?? ''
  const searchParamTags = optimisticSearchParams.getAll('tags') ?? ''
  const searchParamTheaters = optimisticSearchParams.getAll('theaters') ?? ''

  const [title, setTitle] = useState(searchParamTitle)

  useEffect(() => {
    setTitle(searchParamTitle ?? '')
  }, [searchParamTitle])

  return (
    <Form
      className="fixed bottom-0 w-full z-10 bg-background rounded-tr-xl rounded-tl-xl border-t border-white border-opacity-30 p-8 space-y-4"
      method="get"
      onChange={(event) => submit(event.currentTarget, { method: 'get' })}
    >
      <input
        className="appearance-none text-white bg-transparent rounded-full border border-white w-full p-2 pl-4 pr-4"
        type="search"
        name="title"
        placeholder="Titre"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <div className="space-x-2">
        <label htmlFor={DATE_FILTER.DEFAULT}>Default</label>
        <input
          id={DATE_FILTER.DEFAULT}
          className=""
          type="radio"
          name="date"
          value={DATE_FILTER.DEFAULT}
          checked={searchParamDate === DATE_FILTER.DEFAULT}
          onChange={() => {}}
        />
      </div>

      <div className="space-x-2">
        <label htmlFor={DATE_FILTER.TODAY}>Aujourd'hui</label>
        <input
          id={DATE_FILTER.TODAY}
          className=""
          type="radio"
          name="date"
          value={DATE_FILTER.TODAY}
          checked={searchParamDate === DATE_FILTER.TODAY}
          onChange={() => {}}
        />
      </div>

      <div className="space-x-2">
        <label htmlFor={DATE_FILTER.THIS_WEEK}>Cette semaine</label>
        <input
          id={DATE_FILTER.THIS_WEEK}
          className=""
          type="radio"
          name="date"
          value={DATE_FILTER.THIS_WEEK}
          checked={searchParamDate === DATE_FILTER.THIS_WEEK}
          onChange={() => {}}
        />
      </div>

      <div className="space-x-2">
        <label htmlFor={DATE_FILTER.NEXT_WEEK}>Semaine prochaine</label>
        <input
          id={DATE_FILTER.NEXT_WEEK}
          className=""
          type="radio"
          name="date"
          value={DATE_FILTER.NEXT_WEEK}
          checked={searchParamDate === DATE_FILTER.NEXT_WEEK}
          onChange={() => {}}
        />
      </div>

      <div className="flex gap-3 flex-row flex-wrap">
        {tags.length > 0 &&
          tags.map((tag) => (
            <div key={tag} className="space-x-2 capitalize">
              <label htmlFor={tag}>{tag}</label>
              <input
                id={tag}
                className=""
                type="checkbox"
                name="tags"
                value={tag.toLowerCase()}
                checked={searchParamTags.includes(tag)}
                onChange={() => {}}
              />
            </div>
          ))}

        {theaters.length > 0 &&
          theaters.map((theater) => (
            <div key={theater.id} className="space-x-2 capitalize">
              <label htmlFor={theater.id.toString()}>{theater.name}</label>
              <input
                id={theater.id.toString()}
                className=""
                type="checkbox"
                name="theaters"
                value={theater.id}
                checked={searchParamTheaters.includes(theater.id.toString())}
                onChange={() => {}}
              />
            </div>
          ))}
      </div>

      <Link
        to={{ pathname: '../' }}
        type="submit"
        className="block rounded-full text-primary border-primary border p-2 pl-4 pr-4 w-full text-center"
      >
        Réinitialiser les filtres
      </Link>

      <Link
        to={{ pathname: '../', search: location.search }}
        type="submit"
        className="block rounded-full bg-primary p-2 pl-4 pr-4 w-full text-center"
      >
        Montrer {movies.length} resultat{movies.length > 1 ? 's' : ''}
      </Link>
    </Form>
  )
}
