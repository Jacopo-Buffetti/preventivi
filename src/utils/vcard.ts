import type { Biglietto } from '../services/bigliettoService';

// Costruisce un contatto in formato vCard 3.0, il più compatibile con le rubriche
// di Android, iPhone, Gmail e Outlook.

// Caratteri che nel formato vCard hanno un significato speciale
function esc(valore: string): string {
  return valore
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

// Le righe vCard non dovrebbero superare 75 caratteri: quelle più lunghe
// (soprattutto la foto) si spezzano su più righe che iniziano con uno spazio.
function piega(riga: string): string {
  if (riga.length <= 75) return riga;
  const parti = [riga.slice(0, 75)];
  for (let i = 75; i < riga.length; i += 74)
    parti.push(' ' + riga.slice(i, i + 74));
  return parti.join('\r\n');
}

// "Mario Rossi" → nome "Mario", cognome "Rossi".
// Con più parole, l'ultima è il cognome e le altre il nome.
function dividiNome(completo: string): { nome: string; cognome: string } {
  const parole = completo.trim().split(/\s+/);
  if (parole.length === 1) return { nome: parole[0], cognome: '' };
  return {
    nome: parole.slice(0, -1).join(' '),
    cognome: parole[parole.length - 1],
  };
}

// Da "data:image/png;base64,AAAA" ricava tipo ("PNG") e contenuto ("AAAA")
function leggiFoto(dataUri?: string): { tipo: string; base64: string } | null {
  const corrispondenza = dataUri?.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!corrispondenza) return null;
  const tipo =
    corrispondenza[1].toUpperCase() === 'JPG'
      ? 'JPEG'
      : corrispondenza[1].toUpperCase();
  return { tipo, base64: corrispondenza[2] };
}

export function creaVCard(b: Biglietto): string {
  const completo = (b.nome ?? '').trim();
  const { nome, cognome } = dividiNome(completo);
  const pulito = (v?: string) => (v ?? '').trim();

  const righe = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(cognome)};${esc(nome)};;;`,
    `FN:${esc(completo)}`,
  ];

  if (pulito(b.qualifica)) righe.push(`TITLE:${esc(pulito(b.qualifica))}`);
  if (pulito(b.telefono))
    righe.push(`TEL;TYPE=WORK,VOICE:${esc(pulito(b.telefono))}`);
  if (pulito(b.cellulare))
    righe.push(`TEL;TYPE=CELL:${esc(pulito(b.cellulare))}`);
  if (pulito(b.email))
    righe.push(`EMAIL;TYPE=INTERNET,WORK:${esc(pulito(b.email))}`);
  if (pulito(b.email_secondaria))
    righe.push(`EMAIL;TYPE=INTERNET:${esc(pulito(b.email_secondaria))}`);
  // L'indirizzo è un'unica riga: va nel campo "via" dell'indirizzo vCard
  if (pulito(b.indirizzo))
    righe.push(`ADR;TYPE=WORK:;;${esc(pulito(b.indirizzo))};;;;`);

  const foto = leggiFoto(b.logo);
  if (foto) righe.push(`PHOTO;ENCODING=b;TYPE=${foto.tipo}:${foto.base64}`);

  righe.push('END:VCARD');
  return righe.map(piega).join('\r\n') + '\r\n';
}

// Nome del file senza caratteri problematici: "Mario D'Angelo" → "Mario_DAngelo.vcf"
export function nomeFileVCard(b: Biglietto): string {
  const base = (b.nome ?? 'contatto')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return `${base || 'contatto'}.vcf`;
}
