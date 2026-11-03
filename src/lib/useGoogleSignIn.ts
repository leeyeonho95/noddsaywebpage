import { useEffect, useState } from 'react'
import { useAuth } from '../auth/context'
import { toFormError } from './errors'

// Starts Google sign-in and leaves the page for Google. `onError` receives undefined when a new attempt starts.
export function useGoogleSignIn(onError: (message?: string) => void) {
  const { startGoogle } = useAuth()
  const [busy, setBusy] = useState(false)

  // Coming back with the browser's Back button can restore this page from cache while still marked busy.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false)
    }
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  async function start() {
    setBusy(true)
    onError(undefined)
    try {
      const url = await startGoogle()
      if (url) {
        window.location.assign(url)
        return
      }
    } catch (error) {
      onError(toFormError(error).message)
    }
    setBusy(false)
  }

  return { busy, start }
}
