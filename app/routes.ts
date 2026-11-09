import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('filters', 'routes/filters.tsx'),
  route('health', 'routes/health.tsx'),
  route(':movieId', 'routes/movie.tsx'),
] satisfies RouteConfig
