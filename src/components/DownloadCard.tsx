import { useEffect, useState } from 'react'
import { getLatestRelease, type Release } from '../api/releases'

// The Windows build is served from this fixed path on the same server (infra decision). The release API only adds
// the version and size once a build is registered there, and its downloadUrl wins when it is set.
const DOWNLOAD_PATH = '/download/noddsay-win64.zip'

const formatSize = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`

export function DownloadCard() {
  const [release, setRelease] = useState<Release | null>(null)

  useEffect(() => {
    let active = true
    getLatestRelease().then(
      (latest) => {
        if (active) setRelease(latest)
      },
      // Without release details the button still points at the fixed path.
      () => undefined,
    )
    return () => {
      active = false
    }
  }, [])

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
    </div>
  )
}
