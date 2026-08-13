// Money rounding helpers. Mirror of `backend/src/utils/money.ts` so the POS
// displays exactly what the server charges.
//
// - round2       — round to 2 decimal places (USD cents).
// - roundRielUp  — round a KHR amount UP to the nearest 100៛; the amount DUE, so
//                  a customer can never underpay.
// - roundRielDown — round a KHR amount DOWN to the nearest 100៛; CHANGE, so only
//                  payable notes are handed back.
//
// 100៛ is the smallest note in circulation.

const RIEL_NOTE = 100

export const round2 = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100

export const roundRielUp = (amount: number) => Math.ceil(amount / RIEL_NOTE) * RIEL_NOTE

export const roundRielDown = (amount: number) => Math.floor(amount / RIEL_NOTE) * RIEL_NOTE
