// Required consents for sign-up (see components/TermsFieldset).
export interface Terms {
  service: boolean
  privacy: boolean
}

export const NO_TERMS: Terms = { service: false, privacy: false }

export const termsAccepted = (terms: Terms) => terms.service && terms.privacy
