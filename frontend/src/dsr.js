// Display-only mirror of the backend DSR rules; the server stays authoritative.
const WHOLE_NUMBER = /^[0-9]+$/;

export const CIC_OPTIONS = [
  { value: "", label: "Not available" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
];

// Loan amount divided by term, rounded up: the smallest whole-VND payment that still
// covers the loan (BR9), so the suggestion is always accepted by the server.
export function suggestPayment(loanAmount, termMonths) {
  const loanText = String(loanAmount ?? "").trim();
  const termText = String(termMonths ?? "").trim();
  if (!WHOLE_NUMBER.test(loanText) || !WHOLE_NUMBER.test(termText)) return "";
  const loan = BigInt(loanText);
  const term = BigInt(termText);
  if (loan <= 0n || term <= 0n) return "";
  return String((loan + term - 1n) / term);
}

export function dsrInfo(income, payment) {
  const incomeText = String(income ?? "").trim();
  const paymentText = String(payment ?? "").trim();
  if (!WHOLE_NUMBER.test(incomeText) || !WHOLE_NUMBER.test(paymentText)) return null;
  const incomeValue = BigInt(incomeText);
  const paymentValue = BigInt(paymentText);
  if (incomeValue <= 0n || paymentValue <= 0n) return null;
  // payment*100/income rounded to 1 decimal, half-to-even like the backend round(..., 1).
  const scaled = paymentValue * 1000n;
  let tenths = scaled / incomeValue;
  const twiceRemainder = (scaled % incomeValue) * 2n;
  if (twiceRemainder > incomeValue || (twiceRemainder === incomeValue && tenths % 2n === 1n)) tenths += 1n;
  return { percent: Number(tenths) / 10, high: paymentValue * 100n > incomeValue * 50n };
}
