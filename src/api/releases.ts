// Latest published Windows build (Backend ReleaseController). Public, no session needed.

export interface Release {
  version: string
  downloadUrl: string
  sizeBytes: number
}

// null while no build is published (RELEASE_NOT_FOUND); throws on any other failure.
export async function getLatestRelease(): Promise<Release | null> {
  const response = await fetch('/api/v1/client-releases/latest?platform=WINDOWS&architecture=X64')
  if (response.ok) return (await response.json()) as Release
  // Checked by code so a proxy's own 404 page still counts as a failure.
  const body = (await response.json().catch(() => null)) as { code?: unknown } | null
  if (response.status === 404 && body?.code === 'RELEASE_NOT_FOUND') return null
  throw new Error(`release lookup failed: ${response.status}`)
}
