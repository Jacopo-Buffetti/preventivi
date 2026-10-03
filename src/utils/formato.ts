// Funzioni di formattazione condivise

export function formattaNumeroPreventivo(anno: number, numero: number): string {
  return `${anno}/${String(numero).padStart(3, '0')}`;
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
