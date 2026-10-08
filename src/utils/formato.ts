// Funzioni di formattazione condivise

// Le bozze non hanno ancora un numero (null): lo ricevono al primo invio
export function formattaNumeroPreventivo(
  anno: number,
  numero: number | null
): string {
  if (numero === null) return 'Bozza';
  return `${anno}/${String(numero).padStart(3, '0')}`;
}

// Nome del file PDF, senza la "/" che non è ammessa nei nomi dei file.
// Esempio: preventivo-2026-005.pdf
export function nomeFilePreventivo(
  anno: number,
  numero: number | null
): string {
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

// Percentuale dello sconto sul totale con IVA, es. 4 su 244 → 1,639...
export function percentualeSconto(sconto: number, totaleConIva: number): number {
  if (totaleConIva <= 0) return 0;
  return (sconto / totaleConIva) * 100;
}

// 1.6393 → "1,64%"
export function formattaPercentuale(valore: number): string {
  return `${valore.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

// Proposte di arrotondamento per difetto: alla decina, alla cinquantina e al
// centinaio sotto il totale. Solo quelle che danno davvero uno sconto,
// senza doppioni. Es. 244 → [240, 200]; 1.287,50 → [1.280, 1.250, 1.200]
export function proposteArrotondamento(totale: number): number[] {
  const proposte = [10, 50, 100]
    .map((passo) => Math.floor(totale / passo) * passo)
    .filter((v) => v > 0 && v < totale);
  return [...new Set(proposte)];
}

// Converte un testo digitato ("1,5" o "1.5") in numero. Restituisce null se non valido.
export function leggiNumero(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.');
  if (pulito === '') return null;
  const n = Number(pulito);
  return Number.isFinite(n) ? n : null;
}

// Iniziali per gli avatar: "Mario Rossi" → "MR", "Bianchi" → "BI"
export function iniziali(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter(Boolean);
  const lettere =
    parole.length > 1
      ? parole[0][0] + parole[parole.length - 1][0]
      : (parole[0]?.slice(0, 2) ?? '?');
  return lettere.toUpperCase();
}

// Numero per i link WhatsApp (wa.me): solo cifre, con il prefisso
// internazionale. Un cellulare italiano senza prefisso riceve il 39.
export function numeroWhatsApp(telefono: string): string {
  let cifre = telefono.replace(/[^\d+]/g, '');
  if (cifre.startsWith('+')) cifre = cifre.slice(1);
  else if (cifre.startsWith('00')) cifre = cifre.slice(2);
  else if (cifre.length === 10 && cifre.startsWith('3')) cifre = '39' + cifre;
  return cifre.replace(/\D/g, '');
}
