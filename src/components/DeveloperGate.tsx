import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useDeveloperAccess } from '../auth/developerContext'
import { useAuth } from '../auth/context'

export function DeveloperGate({ children, manager = false }: { children: ReactNode; manager?: boolean }) {
  const { access, status, refresh } = useDeveloperAccess()
  const { retryBootstrap } = useAuth()
  const { pathname } = useLocation()
  if (status === 'ready' && (manager ? access?.canManageDevelopers : access?.canViewDashboard)) return children
  return <div className="dev-dashboard"><section className="dev-panel dev-access-gate">
    <p className="dev-eyebrow">DEVELOPER CENTER</p><h1>{manager ? '팀원 권한 관리' : '개발자 대시보드'}</h1>
    {status === 'loading' ? <p role="status">접근 권한을 확인하고 있습니다…</p> : status === 'signed-out' ? <><p>로그인한 계정의 개발자 권한을 확인합니다.</p><Link className="dev-button primary" to="/login" state={{ returnTo: pathname }}>로그인</Link></> : status === 'error' ? <><p role="alert">로그인 상태 또는 접근 권한을 확인하지 못했습니다.</p><button className="dev-button primary" onClick={() => { retryBootstrap(); refresh() }}>다시 확인</button></> : <><p role="alert">{manager ? '권한 관리자만 사용할 수 있습니다.' : '개발자 권한이 필요합니다. 팀 관리자에게 요청해 주세요.'}</p><button className="dev-button" onClick={refresh}>권한 다시 확인</button></>}
    <Link className="dev-back-link" to="/">홈으로 돌아가기</Link>
  </section></div>
}
