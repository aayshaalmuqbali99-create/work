/** Western digits in both languages (common usage in Oman for prices). Client-safe: no data imports. */
export function formatOMR(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
