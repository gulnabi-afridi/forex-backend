export function generate64BitId() {
  const high = Math.floor(Math.random() * 0xffffffff);
  const low = Math.floor(Math.random() * 0xffffffff);
  return (BigInt(high) << 32n) | BigInt(low);
}
