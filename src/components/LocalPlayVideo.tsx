import { useEffect, useState } from 'react'
import race from '../assets/screens/race.webp'

// A development-server URL, not an asset import: unconfirmed footage must stay out of production builds.
const LOCAL_VIDEO = '/src/assets/video/play.mp4'

export function LocalPlayVideo() {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let active = true
    fetch(LOCAL_VIDEO, { method: 'HEAD' }).then(
      (response) => {
        if (active) setAvailable(response.ok && (response.headers.get('Content-Type')?.startsWith('video/') ?? false))
      },
      () => undefined,
    )
    return () => { active = false }
  }, [])

  if (!available) return null

  return (
    <section className="local-play-video" aria-labelledby="play-video-title">
      <div className="game-container game-section-space">
        <div className="local-video-heading">
          <p className="game-kicker">로컬 미리보기</p>
          <h2 id="play-video-title" className="game-heading">플레이 영상 살펴보기</h2>
        </div>
        <video
          src={LOCAL_VIDEO}
          poster={race}
          controls
          playsInline
          preload="metadata"
          aria-labelledby="play-video-title"
          className="local-video-player"
        />
      </div>
    </section>
  )
}
