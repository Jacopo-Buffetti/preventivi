import type { Biglietto } from '../services/bigliettoService';
import { CSS } from './stileBiglietto';

function esc(valore: string | undefined | null): string {
  return String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function riga(icona: string, valore?: string): string {
  if (!valore || !valore.trim()) return '';
  return `<div class="detail-item"><span class="icon">${icona}</span>${esc(valore)}</div>`;
}

function logo(uri: string | undefined, classe: string): string {
  return uri ? `<img src="${uri}" class="${classe}" alt="Logo">` : '';
}

// HTML del biglietto pronto per la stampa: due pagine da 85 x 55 mm, fronte e retro.
// La grafica riprende il template "Versione Chiara".
export function htmlBiglietto(b: Biglietto): string {
  const legali = [
    b.p_iva && `P.IVA ${esc(b.p_iva)}`,
    b.codice_fiscale && `C.F. ${esc(b.codice_fiscale)}`,
    b.rea && `REA ${esc(b.rea)}`,
  ]
    .filter(Boolean)
    .map((v) => `<span>${v}</span>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Biglietto da visita - ${esc(b.nome)}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="business-card front">
    ${logo(b.logo, 'logo-img-front')}
    ${b.descrizione_fronte ? `<div class="brand-subtitle-front">${esc(b.descrizione_fronte)}</div>` : ''}
  </div>

  <div class="business-card back">
    <div class="back-top">
      <div>
        <div class="person-name">${esc(b.nome)}</div>
        ${b.descrizione_retro ? `<div class="person-title">${esc(b.descrizione_retro)}</div>` : ''}
      </div>
      ${logo(b.logo, 'logo-img-small')}
    </div>

    <div class="details-list">
      ${riga('📍', b.indirizzo)}
      ${riga('📞', b.telefono)}
      ${riga('📱', b.cellulare)}
      ${riga('✉️', b.email)}
      ${riga('✉️', b.email_secondaria)}
    </div>

    <div class="legal-footer">${legali}</div>
  </div>
</body>
</html>`;
}
