import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/context'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'

// Login and signup are for signed-out visitors; a signed-in user goes home.
function GuestOnly({ children }: { children: ReactNode }) {
  const { snapshot } = useAuth()
  return snapshot?.status === 'AUTHENTICATED' ? <Navigate to="/" replace /> : children
}

// BrowserRouter does not scroll on navigation: go to the #section, or to the top of a new page.
// Keyed on location.key so clicking the same section link again still scrolls.
function ScrollOnNavigate() {
  const { key, hash } = useLocation()
  useEffect(() => {
    const target = hash && document.getElementById(hash.slice(1))
    // Smoothness and the header offset come from index.css (scroll-behavior, scroll-padding-top).
    if (target) target.scrollIntoView()
    else window.scrollTo({ top: 0, behavior: 'instant' })
  }, [key, hash])
  return null
}

function BootNotice() {
  const { bootError, retryBootstrap } = useAuth()
  if (!bootError) return null
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 bg-error-container px-4 py-3 text-body-sm text-on-error-container">
      {bootError}
      <button type="button" onClick={retryBootstrap} className="rounded-full bg-surface-container-lowest px-4 py-1 font-display text-label-md">
        다시 시도
      </button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollOnNavigate />
      <AuthProvider>
        <div className="flex min-h-dvh flex-col">
          {/* Above the header: the home hero is pulled up under the header and would cover it. */}
          <BootNotice />
          <Header />
          <main className="flex flex-1 flex-col">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
              <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
