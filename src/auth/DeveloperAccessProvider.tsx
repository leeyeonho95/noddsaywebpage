import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './context'
import { DeveloperContext } from './developerContext'
import type { DeveloperAccess } from '../api/developerAccess'

export function DeveloperAccessProvider({ children }: { children: ReactNode }) {
  const { snapshot, retryBootstrap } = useAuth()
  const account = snapshot?.status === 'AUTHENTICATED' ? snapshot.user?.userId : null
  const [result, setResult] = useState<{ account: string; access: DeveloperAccess | null; error: boolean } | null>(null)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(n => n + 1), [])
  useEffect(() => {
    if (!account) return
    const controller = new AbortController()
    let pending = false
    async function update() {
      if (document.hidden || pending) return
      pending = true
      try {
        const response = await fetch('/api/v1/web/developer/access', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
        if (response.status === 401 && !controller.signal.aborted) retryBootstrap()
        if (!response.ok) throw new Error('Access lookup failed')
        const access = await response.json() as DeveloperAccess
        if (typeof access.canViewDashboard !== 'boolean' || typeof access.canManageDevelopers !== 'boolean') throw new Error('Invalid access response')
        if (!controller.signal.aborted) setResult({ account: account!, access, error: false })
      } catch {
        if (!controller.signal.aborted) setResult({ account: account!, access: null, error: true })
      } finally { pending = false }
    }
    void update()
    const timer = setInterval(() => void update(), 15000)
    const onVisible = () => { void update() }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', onVisible); document.removeEventListener('visibilitychange', onVisible) }
  }, [account, revision, retryBootstrap])
  const current = account && result?.account === account ? result : null
  const status = !snapshot ? 'loading' : !account ? 'signed-out' : !current ? 'loading' : current.error ? 'error' : 'ready'
  return <DeveloperContext.Provider value={{ access: current?.access ?? null, status, refresh }}>{children}</DeveloperContext.Provider>
}
