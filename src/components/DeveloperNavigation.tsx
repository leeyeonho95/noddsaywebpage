import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useDeveloperAccess } from '../auth/developerContext'
import { listMotionCandidates } from '../api/motionCandidates'

export const motionCandidatesTab = 'motion-candidates'
export const cameraReplayTab = 'camera-replay'

// 개발자 메뉴: 경기(목록 · 경기 화면 · 내 PC 로그 열기) · 팀원 권한 관리.
// 인식 개선 후보는 승인을 기다리는 후보가 있을 때만 보인다(자동 개선 밤 작업이 채택 규칙을 통과한 후보를 올릴 때, 2026-11-24 개편).
export function DeveloperNavigation({ className = '' }: { className?: string }) {
  const { access } = useDeveloperAccess()
  const { pathname, search } = useLocation()
  const canView = !!access?.canViewDashboard
  const candidates = pathname === '/dev-dashboard' && new URLSearchParams(search).get('tab') === motionCandidatesTab
  const games = pathname.startsWith('/dev-dashboard') && !candidates
  const [pending, setPending] = useState(0)
  useEffect(() => {
    if (!canView) return
    const controller = new AbortController()
    listMotionCandidates(controller.signal, 0, 'pending').then(p => { if (!controller.signal.aborted) setPending(p.total) }).catch(() => {})
    return () => controller.abort()
  }, [canView])
  if (!canView) return null
  return <nav className={`developer-navigation ${className}`} aria-label="개발자 메뉴">
    <Link to="/dev-dashboard" aria-current={games ? 'page' : undefined}>경기</Link>
    {access?.canManageDevelopers && <Link to="/developer-access" aria-current={pathname === '/developer-access' ? 'page' : undefined}>팀원 권한 관리</Link>}
    {(pending > 0 || candidates) && <Link to={`/dev-dashboard?tab=${motionCandidatesTab}`} aria-current={candidates ? 'page' : undefined}>인식 개선 후보{pending > 0 ? ` ${pending}` : ''}</Link>}
  </nav>
}
