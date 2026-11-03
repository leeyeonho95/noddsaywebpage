import { useEffect, useState } from 'react'
import { getLatestRelease, type Release } from '../api/releases'

type State = { kind: 'loading' } | { kind: 'ready'; release: Release } | { kind: 'missing' } | { kind: 'failed' }

const formatSize = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`

const buttonClass =
  'flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-display text-label-lg transition'

export function DownloadCard() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getLatestRelease().then(
      (release) => {
        if (active) setState(release ? { kind: 'ready', release } : { kind: 'missing' })
      },
      () => {
        if (active) setState({ kind: 'failed' })
      },
    )
    return () => {
      active = false
    }
  }, [attempt])

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-6 shadow-xl sm:p-8">
      <h3 className="font-display text-headline-md">Windows용 노디세이</h3>
      {state.kind === 'ready' ? (
        <>
          <a
            href={state.release.downloadUrl}
            className={`${buttonClass} bg-primary-container text-on-primary-container shadow-[0_4px_0_#d97706] hover:brightness-105`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              download
            </span>
            게임 다운로드
          </a>
          <p className="text-center text-body-sm text-on-surface-variant">
            버전 {state.release.version} · {formatSize(state.release.sizeBytes)}
          </p>
        </>
      ) : state.kind === 'failed' ? (
        <div role="alert" className="flex flex-col items-center gap-3 text-center text-body-sm text-on-surface-variant">
          다운로드 정보를 불러오지 못했어요.
          <button
            type="button"
            onClick={() => {
              setState({ kind: 'loading' })
              setAttempt((n) => n + 1)
            }}
            className="inline-flex items-center gap-1 rounded-full bg-surface-container px-4 py-2 font-display text-label-md text-on-surface"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              refresh
            </span>
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <button type="button" disabled className={`${buttonClass} cursor-not-allowed bg-surface-container text-on-surface-variant`}>
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              download
            </span>
            {state.kind === 'loading' ? '확인하는 중…' : '1차 출시 준비 중이에요'}
          </button>
          {state.kind === 'missing' && (
            <p className="text-center text-body-sm text-on-surface-variant">출시되면 이곳에서 바로 받을 수 있어요.</p>
          )}
        </>
      )}
    </div>
  )
}
