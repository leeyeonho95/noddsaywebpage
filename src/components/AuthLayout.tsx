import type { ReactNode } from 'react'
import heroArt from '../assets/hero.webp'
import logo from '../assets/logo.webp'

export function AuthLayout({ title, children, signup = false }: { title: string; children: ReactNode; signup?: boolean }) {
  return (
    <section className={`auth-page${signup ? ' auth-page-signup' : ''}`}>
      <div className="auth-shell">
        <aside className="auth-story" aria-label="노디세이 모험 소개">
          <img src={heroArt} alt="" width={1600} height={900} className="auth-art" />
          <div className="auth-story-copy">
            <img src={logo} alt="노디세이 NODDSAY" width={640} height={329} className="auth-logo" />
            <p className="game-kicker">친구들과 함께 노 젓는 모험</p>
            <h2>힘을 합쳐서<br />집으로 돌아가요!</h2>
            <p className="game-copy">
              <span className="block">두 사람의 호흡으로 한 배를 움직여요</span>
              <span className="block">친구들과 우리만의 레이스를 시작하세요</span>
            </p>
            <p className="auth-story-facts">4인 · 2대2 레이스 <span aria-hidden="true">/</span> 웹캠 모션 게임</p>
          </div>
        </aside>
        <div className="auth-panel">
          <div className="auth-heading">
            <p className="game-kicker">노디세이 계정</p>
            <h1>{title}</h1>
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
