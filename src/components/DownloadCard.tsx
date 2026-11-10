import { useEffect, useState } from 'react'
import { buildFileExists, getLatestRelease, type Release } from '../api/releases'

// The Windows build is served from this fixed path on the same server (infra decision). The release API only adds
// the version and size once a build is registered there, and its downloadUrl wins when it is set.
// Until the file is uploaded the button says 출시 준비 중 instead of leading to a 404 (team decision 2026-11-05);
// uploading it is enough to turn the button on, with no web deploy.
const DOWNLOAD_PATH = '/download/noddsay-win64.zip'

const formatSize = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`

export function DownloadCard() {
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
  if (!release?.downloadUrl && hasFile === false) {
    return (
      <p className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-high px-6 py-3.5 font-display text-label-lg text-on-surface-variant">
        <span aria-hidden="true" className="material-symbols-outlined text-2xl">
          schedule
        </span>
        출시 준비 중
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <a
        href={release?.downloadUrl ?? DOWNLOAD_PATH}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-container px-6 py-3.5 font-display text-label-lg text-on-primary-container shadow-[0_4px_0_#d97706] transition hover:brightness-105"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-2xl">
          download
        </span>
        게임 다운로드
      </a>
      {release && (
        <p className="text-center text-body-sm text-on-surface-variant">
          버전 {release.version} · {formatSize(release.sizeBytes)}
        </p>
      )}
      {/* From 1.3.0 the game ships as an unsigned installer (S15P31A206-264). An old zip copy, run directly,
          takes the noddsay:// link back to its own exe, so players are asked to delete it. Shown only when the link
          is the installer: a zip link (no installer release yet, the fixed-path fallback, a rollback) keeps it hidden
          so zip players are not told to delete the game they use. */}
      {/\.exe$/i.test(release?.downloadUrl ?? '') && (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-on-surface-variant">
          <li>받은 설치 파일을 열어 설치해 주세요</li>
          <li>
            ‘Windows의 PC 보호’ 창이 뜨면 <span className="whitespace-nowrap">[추가 정보] → [실행]</span>을 눌러 주세요
          </li>
          <li>예전에 zip으로 받아 압축을 푼 게임 폴더는 지워 주세요</li>
        </ul>
      )}
    </div>
  )
}
