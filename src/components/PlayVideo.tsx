import { useEffect, useState } from 'react'
import race from '../assets/screens/race.webp'

// A committed release video is bundled automatically. Local drafts are never imported into the build.
const PUBLIC_VIDEO: string | undefined = Object.values(import.meta.glob<string>('../assets/video/play.mp4', { eager: true, import: 'default' }))[0]
const LOCAL_VIDEO = import.meta.env.DEV ? '/src/assets/video/play.local.mp4' : undefined

export function PlayVideo() {
  const [localAvailable, setLocalAvailable] = useState(false)

  useEffect(() => {
    if (PUBLIC_VIDEO || !LOCAL_VIDEO) return
    let active = true
    fetch(LOCAL_VIDEO, { method: 'HEAD' }).then(
      (response) => {
        if (active) setLocalAvailable(response.ok && (response.headers.get('Content-Type')?.startsWith('video/') ?? false))
      },
      () => undefined,
    )
    return () => { active = false }
  }, [])

  const video = PUBLIC_VIDEO ?? (localAvailable ? LOCAL_VIDEO : undefined)
  if (!video) return null

  return (
    <section className="local-play-video" aria-labelledby="play-video-title">
      <div className="game-container game-section-space">
        <div className="local-video-heading">
          <p className="game-kicker">직접 보는 노디세이</p>
          <h2 id="play-video-title" className="game-heading">노 젓는 순간, 레이스가 시작돼요</h2>
          <p className="game-copy">함께 움직이고, 장애물을 넘는 실제 플레이를 만나 보세요.</p>
        </div>
        <div className="local-video-frame">
          <video
            src={video}
            poster={race}
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"
            aria-labelledby="play-video-title"
            className="local-video-player"
          />
        </div>
        <p className="local-video-caption">
          <span aria-hidden="true" className="material-symbols-outlined">play_arrow</span>
          NODDSAY · 플레이 영상
        </p>
      </div>
    </section>
  )
}
