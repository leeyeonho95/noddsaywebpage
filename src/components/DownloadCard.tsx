import { useEffect, useState, type ReactNode } from 'react'
import { buildFileExists, getLatestRelease, type Release } from '../api/releases'

// The Windows build is served from this fixed path on the same server (infra decision). The release API only adds
// the version and size once a build is registered there, and its downloadUrl wins when it is set.
// Until the file is uploaded the button says 출시 준비 중 instead of leading to a 404 (team decision 2026-11-05);
// uploading it is enough to turn the button on, with no web deploy.
const DOWNLOAD_PATH = '/download/noddsay-win64.zip'

const formatSize = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`

export function DownloadCard({ children }: { children?: ReactNode }) {
  const [release, setRelease] = useState<Release | null>(null)
  // Whether the file at the fixed path is there; null while checking (the link shows meanwhile).
  const [hasFile, setHasFile] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    getLatestRelease().then(
      (latest) => {
        if (active) setRelease(latest)
      },
      // Without release details the button still points at the fixed path.
      () => undefined,
    )
    buildFileExists(DOWNLOAD_PATH).then((exists) => {
      if (active) setHasFile(exists)
    })
    return () => {
      active = false
    }
  }, [])

  // A registered release has its own downloadUrl, so only the fixed path needs the check.
  const unavailable = !release?.downloadUrl && hasFile === false

  // Two blocks, the download and the install notes, so the page can set them side by side (S15P31A206-137).
  // children go under the version line (the home page puts its sign-up link there).
  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 self-center text-body-sm font-semibold text-on-surface-variant">
          <span aria-hidden="true" className="material-symbols-outlined text-xl">
            desktop_windows
          </span>
          Windows PC
        </span>
        {unavailable ? (
          <p className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-high px-6 py-3.5 font-display text-label-lg text-on-surface-variant">
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              schedule
            </span>
            출시 준비 중
          </p>
        ) : (
          <a
            href={release?.downloadUrl ?? DOWNLOAD_PATH}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3.5 font-display text-label-lg text-on-primary-container shadow-[0_4px_0_#d97706] transition hover:brightness-105"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">
              download
            </span>
            게임 다운로드
          </a>
        )}
        {!unavailable && release && (
          <p className="text-center text-body-sm text-on-surface-variant">
            버전 {release.version} · {formatSize(release.sizeBytes)}
          </p>
        )}
        {children}
      </div>
      {/* From 1.3.0 the game ships as an unsigned installer (S15P31A206-264). The installer starts the game when it
          finishes, and a game started directly opens this site and closes, which players took for a failure. An old
          zip copy, run directly, takes the noddsay:// link back to its own exe, so deleting it is suggested (not
          required). Shown only when the link is the installer: a zip link (no installer release yet, the fixed-path
          fallback, a rollback) keeps it hidden so zip players are not told to delete the game they use. */}
      {/\.exe$/i.test(release?.downloadUrl ?? '') && (
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body-sm text-on-surface-variant">
          <li>받은 설치 파일을 열어 설치해 주세요</li>
          <li>
            ‘Windows의 PC 보호’ 창이 뜨면 <span className="whitespace-nowrap">[추가 정보] → [실행]</span>을 눌러 주세요
          </li>
          <li>설치 후 게임이 잠깐 열렸다 닫히는 건 정상이에요. 이 페이지에서 [게임 시작]을 눌러 주세요</li>
          <li>예전에 zip으로 받은 게임 폴더는 이제 지워도 돼요</li>
        </ul>
      )}
    </>
  )
}
