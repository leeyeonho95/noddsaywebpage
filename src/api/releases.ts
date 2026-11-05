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

// Whether a build file is on the server. Only a non-HTML success counts: the dev server answers unknown paths with
// the site's page. A failed check says yes, so a network hiccup never hides a working link.
export async function buildFileExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    return response.ok && !(response.headers.get('Content-Type') ?? '').includes('text/html')
  } catch {
    return true
  }
}
