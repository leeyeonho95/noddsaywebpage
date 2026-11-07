import { useState } from 'react'
import { Link } from 'react-router'
import heroArt from '../assets/hero.webp'
import logo from '../assets/logo.webp'
import race from '../assets/screens/race.webp'
import select from '../assets/screens/select.webp'
import { useAuth } from '../auth/context'
import { DownloadCard } from '../components/DownloadCard'
import { GameStartButton } from '../components/GameStartButton'
import { MotionGuide } from '../components/MotionGuide'
import { PlayVideo } from '../components/PlayVideo'
import { CHARACTERS } from '../content/characters'
import { ITEMS } from '../content/items'
import { MAPS } from '../content/maps'

// Only real facts: oars, logs, items and four players come from the game code (KeyboardRowingBoat,
// CharacterSelectScreen, RaceItems); webcam motion was confirmed by the team. The eight characters follow
// the images the team supplied; whether all eight ship in the first release is still to be confirmed.
const FACTS = [
  { icon: 'groups', title: '4인 2대2', text: '노트북 한 대에서 두 팀으로' },
  { icon: 'videocam', title: '웹캠 모션', text: '컨트롤러 없이 몸으로 노 젓기' },
  { icon: 'rowing', title: '한 배에 두 사람', text: '왼쪽·오른쪽 노를 나눠 맡기' },
  { icon: 'face', title: '캐릭터 8종', text: '신화와 전설에서 온 대원들' },
] as const

const GUIDE = [
  ['플랫폼', 'PC · Windows 10 / 11 (64-bit)'],
  ['플레이 방식', '4인 · 2대2 팀 대결'],
  ['필요 장비', '웹캠(카메라 기능이 있는 노트북) 한 대'],
  ['최소 / 권장 사양', '측정한 뒤 안내할 예정'],
] as const

function SectionTitle({ eyebrow, title, lines }: { eyebrow: string; title: string; lines?: readonly string[] }) {
  return (
    <div className="game-section-title">
      <p className="game-kicker">{eyebrow}</p>
      <h2 className="game-heading">{title}</h2>
      {lines && <p className="game-copy"><Lines lines={lines} /></p>}
    </div>
  )
}

// One sentence (or clause) per line; long lines still wrap between words, without leaving a lone last word.
function Lines({ lines }: { lines: readonly string[] }) {
  return lines.map((line) => (
    <span key={line} className="block text-pretty">
      {/* The trailing space keeps sentences apart in copied text and search. */}
      {line}{' '}
    </span>
  ))
}

// Preserve the whole screenshot, including the game UI in its corners.
function Screenshot({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} width={1280} height={720} loading="lazy" className="game-screenshot" />
}

// Map art and its obstacles share one panel. Common items live outside this switcher.
function MapSwitcher() {
  const [current, setCurrent] = useState(0)

  return (
    <section className="game-maps" aria-label="맵과 전용 장애물">
      <div className="game-container game-section-space">
        <div className="game-section-header">
          <SectionTitle eyebrow="02 · 모험의 무대" title="같은 노 젓기, 다른 모험" lines={['물길이 달라지면, 마주하는 장애물도 달라져요']} />
          <div role="group" aria-label="맵 고르기" className="map-switch">
            {MAPS.map((item, index) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={index === current}
                aria-controls="map-panel"
                onClick={() => setCurrent(index)}
                className={`map-switch-button ${index === current ? 'is-active' : ''}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div id="map-panel" className="map-panel" aria-live="polite" aria-atomic="true">
          <div className="map-art">
            {MAPS.map((item, index) => (
              <img
                key={item.name}
                src={item.image}
                alt={index === current ? item.alt : ''}
                width={1280}
                height={720}
                loading="lazy"
                className={`absolute inset-0 size-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${index === current ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
          </div>
          <div className="map-details-stack">
            {MAPS.map((map, index) => (
              <div key={map.name} className={`map-details${index === current ? '' : ' is-inactive'}`} aria-hidden={index !== current} inert={index !== current}>
                <div className="map-intro">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="game-kicker">{map.label} 맵</span>
                </div>
                <h3 className="game-subheading mt-3">{map.name}</h3>
                <p className="game-copy mt-3"><Lines lines={map.lines} /></p>
                </div>
                <div className="map-obstacles">
                  <div className="map-obstacles-heading">
                    <h4>{map.label}에서 만나는 장애물</h4>
                  </div>
                  <ul className="map-obstacle-list">
                    {map.obstacles.map((obstacle) => (
                      <li key={obstacle.name} className="map-obstacle">
                        <div className="obstacle-art">
                          <img
                            src={obstacle.image}
                            alt=""
                            width={obstacle.width}
                            height={obstacle.height}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="game-entry-title">{obstacle.name}</p>
                            {obstacle.motion && (
                              <span className="obstacle-motion">{obstacle.motion}</span>
                            )}
                          </div>
                          <p className="game-copy mt-1">
                            <Lines lines={obstacle.lines} />
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function HomePage() {
  const { snapshot } = useAuth()
  const user = snapshot?.status === 'AUTHENTICATED' ? snapshot.user : null

  return (
    <>
      {/* Pulled up under the sticky header (4rem + 1px border), which is transparent over the art until the page scrolls. */}
      <section className="relative isolate -mt-[calc(4rem+1px)] flex min-h-dvh overflow-hidden bg-[#1F1A14] text-white">
        <img src={heroArt} alt="" width={1600} height={900} className="absolute inset-0 -z-10 size-full object-cover" />
        {/* Shade behind the transparent header so its white links stay readable over the bright sky. */}
        <div className="absolute inset-x-0 top-0 -z-10 h-[200px] bg-[linear-gradient(180deg,#1F1A14CC_0,transparent)]" />
        {/* Warm dark wash keeps white text at AA over the bright spray. Below lg the text spans most of the width, so the
            wash is even; from lg it covers only the text column and the bottom bar, leaving the art on the right untouched.
            Opacities come from the worst-case (white) pixel under the text. */}
        <div className="absolute inset-0 -z-10 bg-[#1F1A14]/75 lg:bg-transparent lg:bg-[linear-gradient(90deg,#1F1A14E6_0,#1F1A14B3_60%,transparent_75%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#1F1A14E6_0,transparent_45%)] lg:bg-[linear-gradient(0deg,#1F1A14CC_0,transparent_30%)]" />

        <div className="mx-auto flex w-full max-w-6xl flex-col justify-end px-4 pt-30 pb-3 md:px-8">
          <div className="max-w-xl pb-10 md:pb-16">
            <p className="flex items-center gap-3 text-body-sm font-semibold">
              <span aria-hidden="true" className="h-[3px] w-7 bg-[#FFE39A]" />
              친구들과 함께 노 젓는 래프팅 레이스
            </p>
            <h1 className="mt-4">
              <img
                src={logo}
                alt="NODDSAY"
                width={640}
                height={329}
                className="h-auto w-52 drop-shadow-[0_6px_16px_rgba(11,37,69,0.45)] md:w-80"
              />
              <span className="mt-2 block font-display text-[28px]/9 font-bold tracking-wide md:text-4xl/tight">노디세이</span>
            </h1>
            <p className="mt-4 font-display text-lg font-bold text-[#FFE39A] md:text-[22px]">힘을 합쳐서 집으로 돌아가요!</p>
            <p className="mt-3 text-body-md leading-relaxed">
              <Lines lines={['노트북 웹캠 앞에 선 네 명이 두 팀으로 나뉘어 겨뤄요', '컨트롤러 없이, 몸으로 노 젓는 동작을 하면 배가 나아가요']} />
            </p>
            <p className="mt-4 text-body-sm">
              4인 · 2대2 팀 대결 <span aria-hidden="true">·</span> Windows PC <span aria-hidden="true">·</span> 웹캠 필요
            </p>
            <div className="mt-6 flex flex-wrap gap-3 font-display text-label-lg">
              <GameStartButton className="inline-flex items-center gap-2 rounded-full bg-primary-container px-7 py-3 text-on-primary-container shadow-[0_4px_0_#d97706] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFE39A] disabled:opacity-60" />
              <Link
                to={{ pathname: '/', hash: '#download' }}
                className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-7 py-3 backdrop-blur-sm hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFE39A]"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-2xl">
                  download
                </span>
                게임 다운로드
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/25 pt-2 text-body-sm">
            <Link
              to={{ pathname: '/', hash: '#about' }}
              className="inline-flex min-h-11 items-center gap-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#FFE39A]"
            >
              <span aria-hidden="true">↓</span> 게임 소개 보기
            </Link>
          </div>
        </div>
      </section>

      <section aria-label="게임 특징" className="border-y border-surface-container-high bg-surface-container-lowest">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4 md:px-8">
          {FACTS.map((fact) => (
            <li key={fact.title} className="flex items-center gap-3">
              <span aria-hidden="true" className="material-symbols-outlined rounded-full bg-primary-fixed p-2.5 text-2xl text-primary">
                {fact.icon}
              </span>
              <div>
                <p className="font-display text-label-lg">{fact.title}</p>
                <p className="text-body-sm text-on-surface-variant">{fact.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="about" className="game-intro">
        <div className="game-container game-section-space">
          <SectionTitle
            eyebrow="01 · 게임 소개"
            title="두 사람의 호흡이, 배의 속도"
            lines={['웹캠 앞에서 몸으로 노를 젓는 4인 모션 레이싱', '두 사람의 호흡으로 한 배를 움직이고, 상대 팀보다 먼저 나아가세요']}
          />
          <div className="game-features">
            <article className="game-feature">
              <div className="feature-visual">
                <Screenshot src={race} alt="두 팀의 배가 화면을 나눠 겨루는 경기 화면" />
                <span className="feature-caption">함께 젓고, 함께 나아가는 2대2 레이스</span>
              </div>
              <div className="feature-copy">
                <span className="feature-number" aria-hidden="true">01</span>
                <p className="game-kicker">몸으로 플레이하는 레이스</p>
                <h3 className="game-subheading">왼쪽, 오른쪽<br />둘이 맞춰야 앞으로!</h3>
                <p className="game-copy">
                  <Lines lines={['한 배에 두 사람이 탑승해서 왼쪽과 오른쪽 노를 하나씩 맡아요', '노 젓는 동작을 하면 배가 움직여요']} />
                </p>
                <p className="feature-note"><Lines lines={['한쪽만 저으면 빙글빙글!', '속도와 방향을 함께 맞춰 보세요']} /></p>
              </div>
            </article>
            <article className="game-feature game-feature-reverse">
              <div className="feature-visual">
                <Screenshot src={select} alt="네 명이 각자 캐릭터를 고르는 캐릭터 선택 화면" />
                <span className="feature-caption">네 명의 대원, 두 팀의 모험</span>
              </div>
              <div className="feature-copy">
                <span className="feature-number" aria-hidden="true">02</span>
                <p className="game-kicker">컨트롤러 없이, 친구들과 함께</p>
                <h3 className="game-subheading">노트북 하나면<br />네 명의 레이스 준비 끝</h3>
                <p className="game-copy">
                  <Lines lines={['웹캠 하나가 네 명의 동작을 한 번에 알아봐요', '각자 마음에 드는 대원을 고르고, 두 팀으로 나눠 모험을 시작하세요']} />
                </p>
                <p className="feature-note">별도의 컨트롤러 대신, 여러분의 움직임을 준비해 주세요</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <PlayVideo />

      <MapSwitcher />

      <section className="game-items" aria-label="모든 맵 공통 아이템">
        <div className="game-container game-section-space">
          <div className="game-section-header">
            <div>
              <SectionTitle eyebrow="03 · 아이템" title="레이스의 흐름을 바꿔 보세요" lines={['물음표 박스를 통해 얻은 아이템을 모션으로 사용할 수 있어요']} />
              <a href="#item-use-motion" className="motion-guide-link">아이템 사용 모션 보기</a>
            </div>
            <span className="game-badge common-item-badge"><span aria-hidden="true" className="material-symbols-outlined">sailing</span> 모든 맵 공통</span>
          </div>
          <ul className="item-list">
            {ITEMS.map((item, index) => (
              <li key={item.name} className="item-entry">
                <div className="item-art"><img src={item.image} alt="" width={256} height={256} loading="lazy" /></div>
                <div>
                  <p className="item-index" aria-hidden="true">ITEM 0{index + 1}</p>
                  <h3 className="game-subheading">{item.name}</h3>
                  <p className="game-copy"><Lines lines={item.lines} /></p>
                  {item.name === '번개 화살' && <a href="#motions" className="motion-guide-link">방어 모션 5가지 보기</a>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="characters" className="game-characters">
        <div className="game-container game-section-space">
          <SectionTitle eyebrow="04 · 모험의 대원들" title="어떤 대원과 노를 저을까요?" lines={['신화와 전설에서 온 8명의 대원', '함께할 친구를 만나 보세요']} />
          <ul className="character-roster">
            {CHARACTERS.map((character, index) => (
              <li key={character.name} className={`character-entry character-tone-${index % 4}`}>
                <div className="character-stage">
                  <span className="character-number" aria-hidden="true">0{index + 1}</span>
                  <img
                    src={character.image}
                    alt=""
                    width={480}
                    height={480}
                    loading="lazy"
                    className="character-image"
                  />
                </div>
                <div className="character-label">
                  <h3 className="game-subheading">{character.name}</h3>
                  <p>{character.nickname}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MotionGuide />

      <section id="download" className="game-download game-container game-section-space">
        <div className="download-panel">
          <div className="download-copy">
            <p className="game-kicker">모험을 시작할 시간</p>
            <div className="download-title-row">
              <span aria-hidden="true" className="material-symbols-outlined download-title-icon">download</span>
              <h2 className="game-heading">지금 당장 노 저으러 가볼까요?</h2>
            </div>
            <p className="game-copy">친구들과 호흡을 맞추고, 우리만의 레이스를 시작하세요</p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 md:w-64">
            <span className="inline-flex items-center gap-2 self-center text-body-sm font-semibold text-on-surface-variant">
              <span aria-hidden="true" className="material-symbols-outlined text-xl">
                desktop_windows
              </span>
              Windows PC
            </span>
            <DownloadCard />
            {!user && (
              <p className="text-center text-body-sm text-on-surface-variant">
                게임 계정이 없다면
                <Link to="/signup" className="ml-1 font-display text-label-md text-secondary hover:underline">
                  회원가입
                </Link>
              </p>
            )}
          </div>
        </div>
        <div id="guide" className="play-guide">
          <h3 className="game-entry-title">플레이 안내</h3>
          <dl className="play-guide-details">
            {GUIDE.map(([term, detail]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  )
}
