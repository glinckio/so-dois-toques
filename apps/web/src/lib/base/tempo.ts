/** VIVO-CA-08: tempo desde um instante, em texto curto: "35 min", "2 h 14 min", "1 dia e 3 h". */
export function tempoDecorrido(desde: string | Date, agora: Date = new Date()): string {
  const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(desde).getTime()) / 60_000));
  if (minutos < 1) return "menos de 1 min";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    const resto = minutos % 60;
    return resto ? `${horas} h ${resto} min` : `${horas} h`;
  }
  const dias = Math.floor(horas / 24);
  const horasResto = horas % 24;
  const nome = dias === 1 ? "dia" : "dias";
  return horasResto ? `${dias} ${nome} e ${horasResto} h` : `${dias} ${nome}`;
}
