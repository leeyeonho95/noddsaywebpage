import { useEffect, useState } from 'react'
import { getMapRanking, type RankingEntry } from '../api/rankings'
import { MAPS } from '../content/maps'
import './ranking.css'

const MAP_IDS = ['tropical-river', 'desert-oasis'] as const
const PODIUM_ORDER = [2, 1, 3]

function formatTime(ms: number) {
  const minutes = String(Math.floor(ms / 60000)).padStart(2, '0')
  const seconds = String(Math.floor(ms / 1000) % 60).padStart(2, '0')
  return `${minutes}:${seconds}.${String(ms % 1000).padStart(3, '0')}`
}

type RankingState =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; entries: RankingEntry[] }

function RankingBoard({ map, mapId }: { map: (typeof MAPS)[number]; mapId: string }) {
  const [ranking, setRanking] = useState<RankingState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getMapRanking(mapId, controller.signal).then(
      (entries) => {
        if (!controller.signal.aborted) setRanking({ status: 'ready', entries })
      },
      () => {
        if (!controller.signal.aborted) setRanking({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [mapId, attempt])

  const entries = ranking.status === 'ready' ? ranking.entries : []
  const remaining = entries.filter(({ rank }) => rank > 3)

  return (
    <section className="ranking-board" aria-labelledby={mapId} data-map={mapId}>
      <header className="ranking-map">
        <img src={map.image} alt="" />
        <h2 id={mapId}>{map.name}</h2>
      </header>
      {entries.length > 0 ? (
        <>
          <ol className="ranking-podium" aria-label="상위 3팀">
            {PODIUM_ORDER.map((rank) => {
              const entry = entries.find((record) => record.rank === rank)
              return (
                <li key={rank} data-rank={rank} value={rank}>
                  <span className="ranking-medal">{rank}위</span>
                  <strong>{entry?.teamName ?? '—'}</strong>
                  <span className="ranking-time">{entry && formatTime(entry.finishTimeMs)}</span>
                </li>
              )
            })}
          </ol>
          {remaining.length > 0 && (
            <table className="ranking-table">
              <caption className="sr-only">{map.name} 4~10위</caption>
              <thead><tr><th scope="col">순위</th><th scope="col">팀명</th><th scope="col">완주 기록</th></tr></thead>
              <tbody>
                {remaining.map((entry) => (
                  <tr key={entry.rank}>
                    <td>{entry.rank}위</td>
                    <th scope="row">{entry.teamName}</th>
                    <td className="ranking-time">{formatTime(entry.finishTimeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      ) : (
        <div className="ranking-status">
          <p role="status">
            {ranking.status === 'loading' && '랭킹을 가져오는 중…'}
            {ranking.status === 'ready' && '아직 완주 기록이 없어요.'}
            {ranking.status === 'error' && '랭킹을 가져오지 못했어요.'}
          </p>
          {ranking.status === 'error' && (
            <button type="button" onClick={() => {
              setRanking({ status: 'loading' })
              setAttempt((value) => value + 1)
            }}>다시 시도</button>
          )}
        </div>
      )}
    </section>
  )
}

export function RankingPage() {
  return (
    <main className="ranking-page">
      <h1>노 전당</h1>
      <div className="ranking-grid">
        <RankingBoard map={MAPS[0]} mapId={MAP_IDS[0]} />
        <RankingBoard map={MAPS[1]} mapId={MAP_IDS[1]} />
      </div>
    </main>
  )
}
