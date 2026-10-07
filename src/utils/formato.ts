// Funzioni di formattazione condivise

// Le bozze non hanno ancora un numero (null): lo ricevono al primo invio
export function formattaNumeroPreventivo(anno: number, numero: number | null): string {
  if (numero === null) return 'Bozza';
  return `${anno}/${String(numero).padStart(3, '0')}`;
}

// Nome del file PDF, senza la "/" che non è ammessa nei nomi dei file.
// Esempio: preventivo-2026-005.pdf
export function nomeFilePreventivo(anno: number, numero: number | null): string {
  if (numero === null) return 'preventivo-bozza.pdf';
  return `preventivo-${anno}-${String(numero).padStart(3, '0')}.pdf`;
}

export function formattaData(data: string | Date): string {
  return new Date(data).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formattaEuro(valore: number): string {
  return `€ ${valore.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Converte un testo digitato ("1,5" o "1.5") in numero. Restituisce null se non valido.
export function leggiNumero(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.');
  if (pulito === '') return null;
  const n = Number(pulito);
  return Number.isFinite(n) ? n : null;
}
