import { Link, useLocation } from 'react-router'
import { useDeveloperAccess } from '../auth/developerContext'

export function DeveloperNavigation({ className = '' }: { className?: string }) {
  const { access } = useDeveloperAccess()
  const { pathname } = useLocation()
  if (!access?.canViewDashboard) return null
  return <nav className={`developer-navigation ${className}`} aria-label="개발자 메뉴">
    <Link to="/dev-dashboard" aria-current={pathname === '/dev-dashboard' ? 'page' : undefined}>개발자 대시보드</Link>
    {access.canManageDevelopers && <Link to="/developer-access" aria-current={pathname === '/developer-access' ? 'page' : undefined}>팀원 권한 관리</Link>}
  </nav>
}
