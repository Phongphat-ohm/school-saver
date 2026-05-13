export function formatMoney(value: number | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} บาท`;
}
