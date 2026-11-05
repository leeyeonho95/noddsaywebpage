import { useState } from 'react'
import { Link } from 'react-router'
import heroArt from '../assets/hero.webp'
import logo from '../assets/logo.webp'
import race from '../assets/screens/race.webp'
import select from '../assets/screens/select.webp'
import { useAuth } from '../auth/context'
import { DownloadCard } from '../components/DownloadCard'
import { GameStartButton } from '../components/GameStartButton'
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
  ['플레이 방식', '4인 · 2대2 팀 대결 (노트북 한 대)'],
  ['필요 장비', '웹캠 1대'],
  ['최소 / 권장 사양', '측정한 뒤 안내할 예정'],
] as const

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mb-10 text-center">
      <p className="font-display text-label-md text-secondary">{eyebrow}</p>
      <h2 className="mt-2 font-display text-headline-md md:text-[40px] md:leading-[48px]">{title}</h2>
      {text && <p className="mt-3 text-body-md text-on-surface-variant">{text}</p>}
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

// The image fills its frame; rounded-2xl rather than the theme's large radii so the game UI in the corners stays visible.
function Screenshot({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} width={1280} height={720} loading="lazy" className="block h-auto w-full rounded-2xl shadow-lg" />
}

// A full-width sand band with a sliding switch between the maps, so it stands apart from the rounded card sections.
// Both images stay mounted so a switch crossfades between them without a reload.
function MapSwitcher() {
  const [current, setCurrent] = useState(0)
  const map = MAPS[current]

  return (
    <div className="bg-surface-container-low">
      {/* Phones stack heading, art, text. From lg the art spans both rows on the right so the map part fits one screen. */}
      <div className="mx-auto grid max-w-6xl gap-y-8 px-4 py-16 text-center md:px-8 md:py-24 lg:grid-cols-[2fr_3fr] lg:gap-x-12 lg:gap-y-6 lg:text-left">
        <div className="lg:self-end">
          <p className="font-display text-label-md text-primary">맵</p>
          <h3 className="mt-2 font-display text-headline-md md:text-[40px] md:leading-[48px]">어디로 떠날까요?</h3>
          <div role="group" aria-label="맵 고르기" className="relative mx-auto mt-8 grid max-w-xs grid-cols-2 rounded-full bg-white/70 p-1 lg:mx-0">
            <span
              aria-hidden="true"
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary-container transition-transform duration-300 motion-reduce:transition-none"
              style={{ transform: `translateX(${current * 100}%)` }}
            />
            {MAPS.map((item, index) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={index === current}
                onClick={() => setCurrent(index)}
                className={`relative flex min-h-11 items-center justify-center gap-1.5 rounded-full font-display text-label-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${index === current ? 'text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface-container shadow-xl lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
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
        <div aria-live="polite" className="lg:self-start">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 lg:justify-start">
            <span className="font-display text-headline-md">{map.name}</span>
            {map.inDevelopment && (
              <span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-xs font-semibold text-primary">개발 중</span>
            )}
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            <Lines lines={map.lines} />
          </p>
        </div>
        {/* Changes with the switch. From lg it spans both columns under the art; a lone obstacle stays centred. */}
        <div className="mt-8 lg:col-span-2 lg:mt-10 lg:text-center">
          <h3 className="font-display text-headline-md">장애물</h3>
          <ul className="mt-8 flex flex-col items-center gap-10 sm:flex-row sm:items-start sm:justify-center">
            {map.obstacles.map((obstacle) => (
              <li key={obstacle.name} className="flex w-full flex-col items-center sm:max-w-md sm:flex-1">
                {/* A fixed-height stage, so the long log and the tall crocodile line up. */}
                <div className="flex h-28 w-full items-center justify-center md:h-36">
                  <img
                    src={obstacle.image}
                    alt=""
                    width={obstacle.width}
                    height={obstacle.height}
                    loading="lazy"
                    className="h-auto max-h-full w-auto max-w-[85%]"
                  />
                </div>
                <p className="mt-3 font-display text-label-lg">{obstacle.name}</p>
                {obstacle.motion && (
                  <span className="mt-1 rounded-full border border-primary/40 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    모션: {obstacle.motion}
                  </span>
                )}
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  <Lines lines={obstacle.lines} />
                </p>
              </li>
            ))}
          </ul>
        </div>
        {/* Items are the same on every map, so they do not change with the switch. */}
        <div className="mt-8 lg:col-span-2 lg:mt-10 lg:text-center">
          <h3 className="font-display text-headline-md">아이템</h3>
          <ul className="mt-8 grid gap-8 sm:grid-cols-3">
            {ITEMS.map((item) => (
              <li key={item.name} className="flex flex-col items-center">
                <img src={item.image} alt="" width={256} height={256} loading="lazy" className="size-20 md:size-28" />
                <p className="mt-3 font-display text-label-lg">{item.name}</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  <Lines lines={item.lines} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
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
            <p className="mt-4 font-display text-lg font-bold text-[#FFE39A] md:text-[22px]">함께 저어야 똑바로 나아가요!</p>
            <p className="mt-3 text-body-md leading-relaxed">
              <Lines lines={['노트북 웹캠 앞에 선 네 명이 두 팀으로 나뉘어 겨뤄요.', '컨트롤러 없이, 몸으로 노 젓는 동작을 하면 배가 나아가요.']} />
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
            <span className="hidden md:inline">CONCEPT ART · 실제 게임 화면과 다를 수 있어요</span>
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
                <p className="text-xs text-on-surface-variant">{fact.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="about">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <SectionTitle eyebrow="게임 소개" title="함께 노를 저어 집으로 가요" />
          <div className="flex flex-col gap-14">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <Screenshot src={race} alt="두 팀의 배가 화면을 나눠 겨루는 경기 화면" />
              <div>
                <h3 className="font-display text-headline-md">둘이 함께 젓는 배</h3>
                <p className="mt-3 text-body-md text-on-surface-variant">
                  <Lines
                    lines={['한 배에 두 사람이 타고 왼쪽과 오른쪽 노를 하나씩 맡아요.', '한쪽만 저으면 배가 돌아가니, 속도와 방향을 함께 맞춰야 해요.']}
                  />
                </p>
              </div>
            </div>
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="md:order-2">
                <Screenshot src={select} alt="네 명이 각자 캐릭터를 고르는 캐릭터 선택 화면" />
              </div>
              <div className="md:order-1">
                <h3 className="font-display text-headline-md">노트북 한 대에 네 명</h3>
                <p className="mt-3 text-body-md text-on-surface-variant">
                  <Lines lines={['웹캠 하나가 네 명의 동작을 한 번에 알아봐요.', '네 명이 모두 캐릭터를 골라야 다음 단계로 넘어가요.']} />
                </p>
              </div>
            </div>
          </div>
        </div>
        <MapSwitcher />
      </section>

      <section id="characters" className="bg-surface-container-low">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <SectionTitle eyebrow="캐릭터" title="함께할 대원을 골라 보세요" text="신화와 전설에서 온 8명의 대원이 기다리고 있어요." />
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {CHARACTERS.map((character) => (
              <li key={character.name} className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-md">
                <img
                  src={character.image}
                  alt=""
                  width={480}
                  height={480}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <div className="px-4 py-3 text-center">
                  <p className="font-display text-label-lg">{character.name}</p>
                  <p className="text-body-sm text-on-surface-variant">{character.nickname}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="download" className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <div className="flex flex-col gap-6 rounded-2xl border border-[#e6d29d] bg-primary-fixed/50 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="material-symbols-outlined hidden rounded-full bg-primary-container p-3 text-3xl text-on-primary-container sm:block"
            >
              download
            </span>
            <div>
              <p className="font-display text-label-md text-primary">다운로드</p>
              <h2 className="mt-1 font-display text-headline-md">노 저으러 가볼까요?</h2>
              <p className="mt-2 text-body-md text-on-surface-variant">Windows PC용 게임이에요.</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-80">
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
      </section>

      <section id="guide" className="mx-auto max-w-6xl px-4 pt-6 pb-16 md:px-8 md:pb-24">
        <SectionTitle eyebrow="시작하기 전에" title="플레이 안내" />
        <dl className="grid gap-6 rounded-2xl bg-surface-container-low p-6 sm:grid-cols-2 sm:gap-x-8 md:p-8">
          {GUIDE.map(([term, detail]) => (
            <div key={term}>
              <dt className="text-body-sm text-on-surface-variant">{term}</dt>
              <dd className="mt-1 font-display text-label-lg">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
