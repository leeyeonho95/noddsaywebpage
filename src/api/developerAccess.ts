import { request, ApiError } from './webAuth'

export interface DeveloperAccess { canViewDashboard: boolean; canManageDevelopers: boolean }
export interface DeveloperMember { userId: string; email: string; displayName: string; enabled: boolean; developer: boolean; manager: boolean }
export interface AccessEvent { id: number; actorUserId: string | null; actorEmail: string | null; targetUserId: string | null; targetEmail: string | null; action: string; createdAt: string }
export interface AccessPage<T> { items: T[]; total: number; offset: number; limit: number }
const base = '/api/v1/web/developer'
export const listMembers = (email: string, offset: number) => request(`${base}/members?${new URLSearchParams({ email, offset: String(offset), limit: '20' })}`).then(r => r.json() as Promise<AccessPage<DeveloperMember>>)
export const listAccessEvents = (offset: number) => request(`${base}/access-events?offset=${offset}&limit=20`).then(r => r.json() as Promise<AccessPage<AccessEvent>>)
export const changeDeveloper = (csrf: string, member: DeveloperMember, developer: boolean) => request(`${base}/members/${encodeURIComponent(member.userId)}`, csrf, { developer, expectedDeveloper: member.developer }).then(r => r.json() as Promise<{ member: DeveloperMember; changed: boolean }>)
export function accessError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return '로그인이 만료됐습니다. 다시 로그인해 주세요.'
    if (error.code === 'DEVELOPER_MANAGER_REQUIRED') return '권한 관리자만 사용할 수 있습니다.'
    if (error.code === 'MANAGER_ACCOUNT_PROTECTED') return '관리자 계정의 권한은 이 화면에서 변경할 수 없습니다.'
    if (error.code === 'ACCESS_CHANGED') return '다른 관리자가 권한을 변경했습니다. 다시 조회해 주세요.'
    if (error.code === 'ACCOUNT_DISABLED') return '사용 중지된 계정에는 권한을 부여할 수 없습니다.'
    if (error.code === 'ACCOUNT_NOT_FOUND') return '계정을 찾을 수 없습니다. 다시 조회해 주세요.'
    if (error.status === 429) return '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
    if (error.status === 403) return '요청을 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.'
  }
  return '서버에 연결하지 못했습니다. 다시 시도해 주세요.'
}
