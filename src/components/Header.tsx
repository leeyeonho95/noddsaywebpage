import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import logo from '../assets/logo.webp'
import { useAuth } from '../auth/context'
import { toFormError } from '../lib/errors'
import { GameStartButton } from './GameStartButton'
import { useActiveSection } from '../lib/useActiveSection'
import { useScrolled } from '../lib/useScrolled'

const SECTIONS = [
  ['about', '게임 소개'],
  ['motions', '게임 조작 가이드'],
  ['download', '다운로드'],
] as const
const SECTION_IDS = SECTIONS.map(([id]) => id)

export function Header() {
  const { snapshot, logout } = useAuth()
  const { pathname, hash } = useLocation()
  const activeSection = useActiveSection(SECTION_IDS, pathname === '/', hash)
  // At the top of the home page the header sits on the hero art; once scrolled it becomes the solid bar.
  const scrolled = useScrolled()
  const overHero = pathname === '/' && !scrolled
  const hover = overHero
    ? 'hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE39A]'
    : 'hover:bg-surface-container'
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string>()
  const user = snapshot?.status === 'AUTHENTICATED' ? snapshot.user : null

  async function onLogout() {
    setPending(true)
    setNotice(undefined)
    try {
      await logout()
    } catch (error) {
      setNotice(toFormError(error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <header
      className={`sticky top-0 z-20 border-b transition-colors duration-300 ${overHero ? 'border-transparent bg-transparent text-white' : 'border-surface-container-high bg-surface-container-lowest/90 backdrop-blur'}`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-1 px-1 min-[360px]:px-4 md:gap-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="노디세이 홈">
          <img src={logo} alt="" className="h-8 w-auto min-[360px]:h-10" />
        </Link>
        <nav aria-label="홈 섹션" className="hidden items-center gap-1 font-display text-label-md whitespace-nowrap lg:flex">
          {SECTIONS.map(([id, label]) => {
            const current = activeSection === id
            return (
              <Link
                key={id}
                to={{ pathname: '/', hash: `#${id}` }}
                aria-current={current ? 'location' : undefined}
                className={`relative rounded-full px-4 py-2 transition-colors ${hover} ${current ? 'text-primary after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary' : ''}`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
        <Link
          to={{ pathname: '/', hash: '#motions' }}
          aria-label="게임 조작 가이드"
          aria-current={activeSection === 'motions' ? 'location' : undefined}
          className={`shrink-0 rounded-full px-1 py-2 font-display text-[11px] min-[360px]:px-2 min-[360px]:text-xs sm:px-3 sm:text-label-md lg:hidden ${hover}`}
        >
          <span className="sm:hidden">조작</span><span className="hidden sm:inline">조작 가이드</span>
        </Link>
        <nav aria-label="계정" className="flex items-center gap-0 font-display text-[11px] whitespace-nowrap min-[360px]:text-label-md sm:gap-2">
          {user ? (
            <>
              <span className={`hidden max-w-48 truncate px-2 sm:inline ${overHero ? 'text-white' : 'text-on-surface-variant'}`}>
                {user.displayName}님
              </span>
              <button
                type="button"
                onClick={onLogout}
                disabled={pending}
                className={`rounded-full px-2 py-2 disabled:opacity-60 sm:px-4 ${hover}`}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`rounded-full px-1 py-2 min-[360px]:px-2 sm:px-4 ${hover}`}>
                로그인
              </Link>
              <Link to="/signup" className={`rounded-full px-1 py-2 min-[360px]:px-2 sm:px-4 ${hover}`}>
                회원가입
              </Link>
            </>
          )}
          <GameStartButton className="inline-flex items-center gap-1 rounded-full bg-primary-container px-1 py-2 text-[11px] text-on-primary-container shadow-[0_3px_0_#d97706] hover:brightness-105 disabled:opacity-60 min-[360px]:px-2 min-[360px]:text-xs sm:px-4 sm:text-label-md" />
        </nav>
      </div>
      {notice && (
        <p role="status" className="whitespace-pre-line bg-error-container px-4 py-2 text-center text-body-sm text-on-error-container">
          {notice}
        </p>
      )}
    </header>
  )
}
