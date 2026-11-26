import Decimal from "decimal.js";

import type { Forecast } from "../../map/data/map-gateway";

export const HORIZONS = [30, 60, 90] as const;
export type Horizon = (typeof HORIZONS)[number];

export const isHorizon = (value: unknown): value is Horizon =>
  HORIZONS.some((h) => String(h) === String(value));

/** El punto del horizonte elegido; el primero si la API no lo trae. */
export function pointAt(forecast: Forecast, days: Horizon) {
  return forecast.points.find((p) => p.days === days) ?? forecast.points[0];
}

/** Cuánto cambia el saldo desde hoy hasta `balance`, como texto exacto. */
export function changeFromToday(forecast: Forecast, balance: string): string {
  return new Decimal(balance).minus(forecast.balance).toString();
}

/** El saldo más bajo entre hoy y los 90 días, de los puntos de la API. */
export function lowestBalance(forecast: Forecast): string {
  return forecast.points
    .map((p) => new Decimal(p.balance))
    .reduce((low, b) => Decimal.min(low, b), new Decimal(forecast.balance))
    .toString();
}

/** Los saldos para la línea: hoy y cada horizonte. */
export const chartValues = (forecast: Forecast): string[] => [
  forecast.balance,
  ...forecast.points.map((p) => p.balance),
];
