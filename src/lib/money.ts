/**
 * Aritmética e formatação de valores em ETH sem perda de precisão.
 * Valores trafegam como strings decimais; nunca convertemos para `number`.
 */
import Decimal from 'decimal.js'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export type EthLike = string | Decimal

const d = (v: EthLike) => (v instanceof Decimal ? v : new Decimal(v))

/** Normaliza para string decimal canônica (sem notação científica, até 18 casas). */
export function toEthString(v: EthLike): string {
  return d(v).toDecimalPlaces(18).toFixed()
}

export const eth = {
  add: (...vals: EthLike[]) => toEthString(vals.reduce<Decimal>((acc, v) => acc.plus(d(v)), new Decimal(0))),
  sub: (a: EthLike, b: EthLike) => toEthString(d(a).minus(d(b))),
  mul: (a: EthLike, qty: number | string) => toEthString(d(a).times(qty)),
  /** Percentual (ex.: 10 = 10%) arredondado para 8 casas. */
  percent: (a: EthLike, pct: number) => toEthString(d(a).times(pct).dividedBy(100).toDecimalPlaces(8)),
  cmp: (a: EthLike, b: EthLike) => d(a).comparedTo(d(b)),
  eq: (a: EthLike, b: EthLike) => d(a).equals(d(b)),
  isZero: (a: EthLike) => d(a).isZero(),
  max: (a: EthLike, b: EthLike) => (d(a).greaterThan(d(b)) ? toEthString(a) : toEthString(b)),
}

/**
 * Formata para exibição. Mantém a precisão real (até `maxDecimals`) sem
 * arredondar para cima valores pequenos; remove zeros à direita.
 */
export function formatEth(v: EthLike, opts: { maxDecimals?: number; withUnit?: boolean } = {}): string {
  const { maxDecimals = 6, withUnit = true } = opts
  const dec = d(v)
  let s = dec.toDecimalPlaces(maxDecimals, Decimal.ROUND_DOWN).toFixed()
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  if (dec.greaterThan(0) && new Decimal(s).isZero()) s = `< 0.${'0'.repeat(maxDecimals - 1)}1`
  return withUnit ? `${s} ETH` : s
}
