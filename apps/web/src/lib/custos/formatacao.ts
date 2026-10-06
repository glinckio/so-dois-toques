/** Minutos como horas: 90 vira "1h30", 120 vira "2h", 0 vira "0h". */
export function formatarHoras(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${String(resto).padStart(2, "0")}`;
}
