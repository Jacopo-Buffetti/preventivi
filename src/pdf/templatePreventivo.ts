import { CSS } from './stilePreventivo';

export interface RigaPdf {
  descrizione: string;
  dettagli?: string;
  quantita: string;
  prezzoUnitario: string;
  totale: string;
}

export interface DatiPdfPreventivo {
  numero: string;
  data: string;
  oggetto: string;
  validitaGiorni: number;
  // Logo del biglietto da visita (data URI). Senza logo l'intestazione
  // resta vuota a sinistra.
  logo?: string;

  cliente: {
    nome: string;
    indirizzo?: string;
    codiceFiscale?: string;
    email?: string;
    telefono?: string;
  };

  azienda: {
    nome: string;
    indirizzo?: string;
    partitaIva?: string;
    codiceFiscale?: string;
    email?: string;
    telefono?: string;
    iban?: string;
  };

  righe: RigaPdf[];
  imponibile: string;
  ivaPercentuale: number;
  iva: string;
  totale: string; // totale da pagare (già arrotondato, se c'è lo sconto)
  // Solo se il totale è stato arrotondato
  arrotondamento?: {
    totaleConIva: string;
    sconto: string;
    percentuale: string; // es. "1,64%"
  };

  note?: string;
  modalitaPagamento: string;
  slogan: string;
}

// Evita che testi inseriti dall'utente (es. "<" o "&") rompano l'HTML
function esc(valore: string | number | undefined | null): string {
  return String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Unisce le parti non vuote con un separatore
function unisci(parti: (string | undefined)[], separatore: string): string {
  return parti
    .filter((p) => p && p.trim() !== '')
    .map(esc)
    .join(separatore);
}

// Crea un <p> solo se il contenuto non è vuoto
function riga(contenuto: string): string {
  return contenuto ? `<p>${contenuto}</p>` : '';
}

export function htmlPreventivo(d: DatiPdfPreventivo): string {
  const c = d.cliente;
  const a = d.azienda;

  const fiscaleAzienda = unisci(
    [
      a.partitaIva && `P.IVA ${a.partitaIva}`,
      a.codiceFiscale && `C.F. ${a.codiceFiscale}`,
    ],
    ' · '
  );

  const righe = d.righe
    .map(
      (r) => `
          <tr>
            <td>
              <strong>${esc(r.descrizione)}</strong>
              ${r.dettagli ? `<small>${esc(r.dettagli)}</small>` : ''}
            </td>
            <td>${esc(r.quantita)}</td>
            <td>€ ${esc(r.prezzoUnitario)}</td>
            <td>€ ${esc(r.totale)}</td>
          </tr>`
    )
    .join('');

  const pagamentoIban = a.iban
    ? `<li>
          <strong>Metodo di pagamento:</strong>
          Bonifico Bancario su IBAN:
          <strong>${esc(a.iban)}</strong>.
        </li>`
    : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preventivo ${esc(d.numero)} - ${esc(a.nome)}</title>
  <style>${CSS}</style>
</head>

<body>
  <main class="page">

    <header class="header">
      <div class="brand">
        ${d.logo ? `<img src="${esc(d.logo)}" alt="${esc(a.nome)}" class="logo">` : ''}
      </div>

      <div class="document-meta">
        <div class="document-title">PREVENTIVO</div>
        <div class="document-number">N. <strong>${esc(d.numero)}</strong></div>
        <div class="document-date">Data: <strong>${esc(d.data)}</strong></div>
      </div>
    </header>

    <div class="gold-line"></div>

    <section class="parties">
      <div class="party">
        <div class="section-label">DATI CLIENTE</div>
        <h2>${esc(c.nome)}</h2>
        ${riga(esc(c.indirizzo))}
        ${riga(c.codiceFiscale ? `P.IVA / C.F. ${esc(c.codiceFiscale)}` : '')}
        ${riga(unisci([c.email, c.telefono], ' · '))}
      </div>

      <div class="party company">
        <div class="section-label">PROFESSIONISTA</div>
        <h2>${esc(a.nome)}</h2>
        ${riga(esc(a.indirizzo))}
        ${riga(fiscaleAzienda)}
        ${riga(unisci([a.email, a.telefono], ' · '))}
      </div>
    </section>

    <section class="intro">
      <div>
        <div class="section-label">OGGETTO DEL PREVENTIVO</div>
        <h1>${esc(d.oggetto || 'Preventivo lavori')}</h1>
      </div>

      <div class="validity">
        <span>Validità</span>
        <strong>${d.validitaGiorni} giorni</strong>
      </div>
    </section>

    <section class="items">
      <table>
        <thead>
          <tr>
            <th class="col-description">DESCRIZIONE</th>
            <th class="col-qty">Q.TÀ</th>
            <th class="col-price">PREZZO</th>
            <th class="col-total">TOTALE</th>
          </tr>
        </thead>
        <tbody>${righe}
        </tbody>
      </table>
    </section>

    <section class="bottom">
      <div class="notes">
        ${d.note ? `<div class="section-label">NOTE E CONDIZIONI</div><p>${esc(d.note)}</p>` : ''}
      </div>

      <div class="summary">
        <div class="summary-row">
          <span>Imponibile</span>
          <strong>€ ${esc(d.imponibile)}</strong>
        </div>
        <div class="summary-row">
          <span>IVA ${d.ivaPercentuale}%</span>
          <strong>€ ${esc(d.iva)}</strong>
        </div>
        ${
          d.arrotondamento
            ? `<div class="summary-row">
          <span>Totale con IVA</span>
          <strong>€ ${esc(d.arrotondamento.totaleConIva)}</strong>
        </div>
        <div class="summary-row">
          <span>Sconto ${esc(d.arrotondamento.percentuale)}</span>
          <strong>− € ${esc(d.arrotondamento.sconto)}</strong>
        </div>`
            : ''
        }
        <div class="summary-total">
          <span>TOTALE</span>
          <strong>€ ${esc(d.totale)}</strong>
        </div>
      </div>
    </section>

    <section class="conditions">
      <h2 class="conditions-title">Condizioni di Fornitura</h2>
      <ul>
        <li>
          <strong>Validità preventivo:</strong>
          ${d.validitaGiorni} giorni dalla data di emissione.
        </li>
        <li>
          <strong>Modalità di pagamento:</strong>
          ${esc(d.modalitaPagamento)}
        </li>
        ${pagamentoIban}
      </ul>
    </section>

    <section class="signatures">
      <div class="signature-box">
        <div class="signature-title">Firma per Conferma</div>
        <div class="signature-line"></div>
        <div class="signature-caption">Firma e timbro del professionista</div>
      </div>

      <div class="signature-box">
        <div class="signature-title">Firma per Accettazione Cliente</div>
        <div class="signature-line"></div>
        <div class="signature-caption">Firma del cliente per accettazione del preventivo</div>
      </div>
    </section>

    <footer class="footer">
      <div>
        <strong>${esc(a.nome)}</strong>
        <span>${esc(d.slogan)}</span>
      </div>

      <div class="footer-right">
        ${a.email ? `<span>${esc(a.email)}</span>` : ''}
        ${a.telefono ? `<span>${esc(a.telefono)}</span>` : ''}
      </div>
    </footer>

  </main>
</body>
</html>`;
}
