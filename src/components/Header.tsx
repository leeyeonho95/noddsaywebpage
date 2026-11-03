import { useState } from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo.webp'
import { useAuth } from '../auth/context'
import { toFormError } from '../lib/errors'

const SECTIONS = [
  ['#about', '게임 소개'],
  ['#characters', '캐릭터'],
  ['#download', '다운로드'],
] as const

export function Header() {
  const { snapshot, logout } = useAuth()
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
    <header className="sticky top-0 z-20 border-b border-surface-container-high bg-surface-container-lowest/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="노디세이 홈">
          <img src={logo} alt="" className="h-10 w-auto" />
        </Link>
        <nav aria-label="홈 섹션" className="hidden items-center gap-1 font-display text-label-md whitespace-nowrap lg:flex">
          {SECTIONS.map(([hash, label]) => (
            <Link key={hash} to={{ pathname: '/', hash }} className="rounded-full px-4 py-2 hover:bg-surface-container">
              {label}
            </Link>
          ))}
        </nav>
        <nav aria-label="계정" className="flex items-center gap-1 font-display text-label-md whitespace-nowrap sm:gap-2">
          {snapshot === null ? null : user ? (
            <>
              <span className="hidden max-w-48 truncate px-2 text-on-surface-variant sm:inline">{user.displayName}님</span>
              <button
                type="button"
                onClick={onLogout}
                disabled={pending}
                className="rounded-full px-4 py-2 hover:bg-surface-container disabled:opacity-60"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 hover:bg-surface-container">
                로그인
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-primary-container px-4 py-2 text-on-primary-container shadow-[0_3px_0_#d97706] hover:brightness-105"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
      {notice && (
        <p role="status" className="bg-error-container px-4 py-2 text-center text-body-sm text-on-error-container">
          {notice}
        </p>
      )}
    </header>
  )
}
