import { useEffect, useState } from 'react'
import { getMapRanking, type RankingEntry } from '../api/rankings'
import { MAPS } from '../content/maps'
import './ranking.css'

const MAP_IDS = ['tropical-river', 'desert-oasis'] as const
const PAGE_SIZE = 10

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
  const [page, setPage] = useState(0)

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
  const firstRank = page * PAGE_SIZE + 1
  const lastRank = firstRank + PAGE_SIZE - 1
  const visibleRows = entries.filter(({ rank }) => rank >= firstRank && rank <= lastRank)
  const lastRecordedRank = entries.at(-1)?.rank ?? 0

  return (
    <section className="ranking-board" aria-labelledby={mapId} data-map={mapId}>
      <header className="ranking-map">
        <img src={map.image} alt="" />
        <h2 id={mapId}>{map.name}</h2>
      </header>
      {entries.length > 0 ? (
        <>
          <span className="sr-only" role="status">{firstRank}위부터 {Math.min(lastRank, lastRecordedRank)}위까지</span>
          {visibleRows.length > 0 && (
            <table className="ranking-table">
              <caption className="sr-only">{map.name} {firstRank}–{Math.min(lastRank, lastRecordedRank)}위</caption>
              <thead><tr><th scope="col">순위</th><th scope="col">팀명</th><th scope="col">완주 기록</th></tr></thead>
              <tbody>
                {visibleRows.map((entry) => (
                  <tr key={entry.rank} data-rank={entry.rank}>
                    <td>
                      <span className="ranking-place">
                        {entry.rank}<span className="sr-only">위</span>
                      </span>
                    </td>
                    <th scope="row">{entry.teamName}</th>
                    <td className="ranking-time">{formatTime(entry.finishTimeMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {lastRecordedRank > PAGE_SIZE && (
            <nav className="ranking-pagination" aria-label={`${map.name} 순위 페이지`}>
              <button type="button" aria-label="이전 순위 페이지" disabled={page === 0}
                onClick={() => setPage(page - 1)}>‹</button>
              <button type="button" aria-label="다음 순위 페이지" disabled={lastRank >= lastRecordedRank}
                onClick={() => setPage(page + 1)}>›</button>
            </nav>
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
  const [mapIndex, setMapIndex] = useState(0)

  return (
    <section className="ranking-page" aria-labelledby="ranking-title">
      <div className="ranking-content">
        <header className="ranking-heading">
          <p className="game-kicker">노디세이 랭킹</p>
          <h1 id="ranking-title" className="game-heading">노 전당</h1>
        </header>
        <div role="group" aria-label="랭킹 맵 선택" className="map-switch ranking-maps">
          {MAPS.map((map, index) => (
            <button
              key={map.label}
              type="button"
              aria-pressed={mapIndex === index}
              aria-controls="ranking-map-panel"
              onClick={() => setMapIndex(index)}
              className={`map-switch-button ${mapIndex === index ? 'is-active' : ''}`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-xl">{map.icon}</span>
              <span>{map.label}</span>
            </button>
          ))}
        </div>
        <div id="ranking-map-panel">
          <RankingBoard key={MAP_IDS[mapIndex]} map={MAPS[mapIndex]} mapId={MAP_IDS[mapIndex]} />
        </div>
      </div>
    </section>
  )
}
