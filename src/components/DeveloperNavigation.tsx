import { Link, useLocation } from 'react-router'
import { useDeveloperAccess } from '../auth/developerContext'

export const motionCandidatesTab = 'motion-candidates'
export const cameraReplayTab = 'camera-replay'

export function DeveloperNavigation({ className = '' }: { className?: string }) {
  const { access } = useDeveloperAccess()
  const { pathname, search } = useLocation()
  const dashboard = pathname === '/dev-dashboard'
  const tab = dashboard ? new URLSearchParams(search).get('tab') : null
  const candidates = tab === motionCandidatesTab, replay = tab === cameraReplayTab
  if (!access?.canViewDashboard) return null
  return <nav className={`developer-navigation ${className}`} aria-label="개발자 메뉴">
    <Link to="/dev-dashboard" aria-current={dashboard && !candidates && !replay ? 'page' : undefined}>개발자 대시보드</Link>
    {access.canManageDevelopers && <Link to="/developer-access" aria-current={pathname === '/developer-access' ? 'page' : undefined}>팀원 권한 관리</Link>}
    <Link to={`/dev-dashboard?tab=${motionCandidatesTab}`} aria-current={candidates ? 'page' : undefined}>인식 개선 후보</Link>
    <Link to={`/dev-dashboard?tab=${cameraReplayTab}`} aria-current={replay ? 'page' : undefined}>인식 문제 장면</Link>
  </nav>
}
