// Mirrors Backend AuthInput so most mistakes are caught before a request.
export const PASSWORD_MIN = 12

export const codePoints = (value: string) => [...value].length

export function checkEmail(email: string): string | undefined {
  if (!email) return '이메일을 입력해 주세요.'
  if (codePoints(email) > 254 || !/^[^\s@]+@[^\s@]+$/.test(email)) return '올바른 이메일을 입력해 주세요.'
}

export function checkPassword(password: string): string | undefined {
  const length = codePoints(password)
  if (length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`
  if (length > 128) return '비밀번호는 128자 이하여야 해요.'
}

export function checkDisplayName(displayName: string): string | undefined {
  const value = displayName.normalize('NFC').trim()
  const length = codePoints(value)
  if (length < 2 || length > 40) return '닉네임은 2~40자로 입력해 주세요.'
  if (/[\p{Cc}\p{Cf}]/u.test(value)) return '닉네임에 쓸 수 없는 문자가 있어요.'
}
