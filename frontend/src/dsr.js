// Display-only mirror of the backend DSR rules; the server stays authoritative.
const WHOLE_NUMBER = /^[0-9]+$/;

export const CIC_OPTIONS = [
  { value: "", label: "Not available" },
  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
];

export function dsrInfo(income, payment) {
  const incomeText = String(income ?? "").trim();
  const paymentText = String(payment ?? "").trim();
  if (!WHOLE_NUMBER.test(incomeText) || !WHOLE_NUMBER.test(paymentText)) return null;
  const incomeValue = BigInt(incomeText);
  const paymentValue = BigInt(paymentText);
  if (incomeValue <= 0n || paymentValue <= 0n) return null;
  // payment*100/income rounded to 1 decimal, same as the backend round(..., 1).
  const tenths = (paymentValue * 1000n * 2n + incomeValue) / (incomeValue * 2n);
  return { percent: Number(tenths) / 10, high: paymentValue * 100n > incomeValue * 50n };
}
