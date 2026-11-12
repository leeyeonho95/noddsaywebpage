export interface RankingEntry {
  rank: number
  teamName: string
  finishTimeMs: number
}

export async function getMapRanking(mapId: string, signal: AbortSignal): Promise<RankingEntry[]> {
  const query = new URLSearchParams({ mapId, limit: '10' })
  const response = await fetch(`/api/v1/rankings?${query}`, { credentials: 'omit', signal })
  if (!response.ok) throw new Error(`Ranking request failed (${response.status})`)

  const data: { entries: RankingEntry[] } = await response.json()
  if (!Array.isArray(data.entries)) throw new Error('Invalid ranking response')
  return data.entries
}
