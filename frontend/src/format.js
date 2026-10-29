// Times are always shown in Vietnam time so every officer sees the same value.
const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDateTime(value) {
  if (value == null || value === "") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const p = Object.fromEntries(formatter.formatToParts(date).map(({ type, value: v }) => [type, v]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
