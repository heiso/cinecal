import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { href } from 'react-router'
import { HydratedRouter } from 'react-router/dom'

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  )
})

// Reload the page when a new version was deployed while the tab was in the background
window.addEventListener('focus', async () => {
  const response = await fetch(href('/health'))
  if (response.status === 200) {
    const json = await response.json()
    if (json.build !== window.ENV.BUILD_VERSION && json.shouldRefreshIfVersionMismatch) {
      window.location.reload()
    }
  }
})
