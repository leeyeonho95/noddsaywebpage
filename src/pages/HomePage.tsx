import { Link } from 'react-router'
import heroArt from '../assets/hero.webp'
import logo from '../assets/logo.webp'
import race from '../assets/screens/race.webp'
import select from '../assets/screens/select.webp'
import { useAuth } from '../auth/context'
import { DownloadCard } from '../components/DownloadCard'
import { CHARACTERS } from '../content/characters'

// Only real facts: oars, logs, items and four players come from the game code (KeyboardRowingBoat,
// CharacterSelectScreen, RaceItems); webcam motion was confirmed by the team. The eight characters follow
// the images the team supplied; whether all eight ship in the first release is still to be confirmed.
const FACTS = [
  { icon: 'groups', title: '4인 2대2', text: '노트북 한 대에서 두 팀으로' },
  { icon: 'videocam', title: '웹캠 모션', text: '컨트롤러 없이 몸으로 노 젓기' },
  { icon: 'rowing', title: '한 배에 두 사람', text: '왼쪽·오른쪽 노를 나눠 맡기' },
  { icon: 'face', title: '캐릭터 8종', text: '신화와 전설에서 온 대원들' },
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

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="overflow-hidden rounded-xl bg-surface-container-lowest p-2 shadow-lg">
      <img src={src} alt={alt} width={1280} height={720} loading="lazy" className="h-auto w-full rounded-lg" />
      <figcaption className="px-2 pt-2 pb-1 text-right text-xs text-on-surface-variant">개발 중 화면 시안</figcaption>
    </figure>
  )
}

export function HomePage() {
  const { snapshot } = useAuth()
  const user = snapshot?.status === 'AUTHENTICATED' ? snapshot.user : null

  return (
    <>
      <section className="relative overflow-hidden">
        {/* Decorative key art under a light cream wash, so it stays visible but softer than the logo and buttons. */}
        <img src={heroArt} alt="" width={1600} height={900} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-surface/35" />

        <div className="relative mx-auto flex min-h-[520px] max-w-6xl flex-col items-center justify-center px-4 py-14 text-center md:min-h-[640px] md:px-8">
          <h1>
            <img
              src={logo}
              alt="노디세이 NODDSAY"
              width={640}
              height={329}
              className="h-auto w-72 drop-shadow-[0_8px_16px_rgba(60,25,5,0.35)] md:w-[28rem]"
            />
          </h1>
          <div className="mt-8 flex flex-wrap justify-center gap-3 font-display text-label-lg">
              <Link
                to={{ pathname: '/', hash: '#download' }}
                className="inline-flex items-center gap-2 rounded-full bg-primary-container px-7 py-3 text-on-primary-container shadow-[0_4px_0_#d97706] hover:brightness-105"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-2xl">
                  download
                </span>
                게임 다운로드
              </Link>
              {!user && (
                <Link
                  to="/signup"
                  className="rounded-full bg-surface-container-lowest px-7 py-3 text-secondary shadow-[0_4px_0_#9fcaff] ring-2 ring-secondary-fixed hover:brightness-105"
                >
                  회원가입
                </Link>
              )}
          </div>
          {user && (
            <div className="mt-6 rounded-2xl bg-surface/85 px-5 py-3 shadow-lg backdrop-blur-sm">
              <p className="font-display text-label-lg">{user.displayName}님, 환영해요!</p>
              {/* The game app has its own login; this account works there too. */}
              <p className="mt-1 text-body-sm text-on-surface-variant">
                게임 앱에서 같은 이메일과 비밀번호로 로그인하면 바로 플레이할 수 있어요.
              </p>
            </div>
          )}
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

      <section id="about" className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <SectionTitle
          eyebrow="게임 소개"
          title="함께 노를 저어 급류를 내려가요"
          text="노트북 웹캠 앞에 모인 네 명이 두 팀으로 나뉘어, 몸으로 노를 저어 급류를 내려가는 래프팅 레이스예요."
        />
        <div className="flex flex-col gap-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <Screenshot src={race} alt="두 팀의 배가 화면을 나눠 급류를 내려가는 경기 화면" />
            <div>
              <h3 className="font-display text-headline-md">둘이 함께 젓는 배</h3>
              <p className="mt-3 text-body-md text-on-surface-variant">
                한 배에 두 사람이 타고 왼쪽과 오른쪽 노를 하나씩 맡아요. 한쪽만 저으면 배가 돌아가니, 속도와 방향을 함께
                맞춰야 해요.
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
                웹캠 한 대 앞에 네 명이 모여 두 팀으로 나뉘어요. 네 명이 모두 캐릭터를 골라야 다음 단계로 넘어가요.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-surface-container-low p-6 text-center md:p-10">
            <h3 className="font-display text-headline-md">장애물과 아이템</h3>
            <p className="mx-auto mt-3 max-w-2xl text-body-md text-on-surface-variant">
              낮은 통나무는 두 사람이 모두 몸을 숙여야 지나갈 수 있어요. 레이스에는 날개, 세이렌, 번개 화살 아이템도 있어요.
            </p>
          </div>
        </div>
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
                  width={360}
                  height={360}
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
        <SectionTitle eyebrow="다운로드" title="Windows에서 플레이해요" />
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div className="rounded-xl bg-surface-container-low p-6 sm:p-8">
            <h3 className="font-display text-headline-md">필요한 환경</h3>
            <ul className="mt-4 flex flex-col gap-3 text-body-md">
              <li className="flex items-center gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-2xl text-primary">
                  desktop_windows
                </span>
                Windows 10 / 11 (64-bit)
              </li>
              <li className="flex items-center gap-3">
                <span aria-hidden="true" className="material-symbols-outlined text-2xl text-primary">
                  videocam
                </span>
                웹캠 1대
              </li>
            </ul>
            <p className="mt-4 text-body-sm text-on-surface-variant">CPU·그래픽카드·메모리 권장 사양은 측정한 뒤 안내할게요.</p>
          </div>
          <div>
            <DownloadCard />
            {!user && (
              <p className="mt-4 text-center text-body-sm text-on-surface-variant">
                게임 계정이 없다면
                <Link to="/signup" className="ml-1 font-display text-label-md text-secondary hover:underline">
                  회원가입
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
