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

// Stile del template
const CSS = `
    @page {
      size: A4;
      margin: 0;
    }

    :root {
      --navy: #071522;
      --navy-soft: #122436;
      --gold: #b97a18;
      --gold-light: #d39a38;
      --text: #172330;
      --muted: #66717d;
      --line: #dfe3e7;
      --paper: #ffffff;
      --soft: #f5f6f7;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #e8e8e8;
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      padding: 24px;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: var(--paper);
      padding: 17mm 16mm 12mm;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      min-height: 44mm;
    }

    .brand {
      width: 82mm;
    }

    .logo {
      width: 30mm;
      height: auto;
      display: block;
    }

    .document-meta {
      text-align: right;
      padding-top: 5mm;
    }

    .document-title {
      color: var(--navy);
      font-size: 23px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: 2.8px;
    }

    .document-number,
    .document-date {
      margin-top: 5px;
      color: var(--muted);
      font-size: 10px;
    }

    .document-number strong,
    .document-date strong {
      color: var(--text);
    }

    .gold-line {
      height: 2px;
      width: 100%;
      background: var(--gold);
      margin: 2mm 0 8mm;
    }

    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18mm;
      padding-bottom: 8mm;
      border-bottom: 1px solid var(--line);
    }

    .section-label {
      color: var(--gold);
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 1.6px;
      margin-bottom: 4px;
    }

    .party h2 {
      color: var(--navy);
      font-size: 13px;
      margin: 0 0 5px;
    }

    .party p {
      color: var(--muted);
      font-size: 9px;
      line-height: 1.45;
      margin: 0;
    }

    .company {
      border-left: 2px solid var(--gold);
      padding-left: 7mm;
    }

    .intro {
      display: flex;
      justify-content: space-between;
      align-items: end;
      padding: 8mm 0 6mm;
    }

    .intro h1 {
      color: var(--navy);
      font-size: 17px;
      line-height: 1.2;
      margin: 0;
      max-width: 125mm;
    }

    .validity {
      text-align: right;
      font-size: 9px;
      color: var(--muted);
    }

    .validity span,
    .validity strong {
      display: block;
    }

    .validity strong {
      color: var(--navy);
      margin-top: 2px;
    }

    .items {
      width: 100%;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    thead th {
      background: var(--navy);
      color: white;
      padding: 9px 10px;
      text-align: left;
      font-size: 8px;
      letter-spacing: 1px;
    }

    thead th:not(:first-child),
    tbody td:not(:first-child) {
      text-align: right;
    }

    tbody td {
      border-bottom: 1px solid var(--line);
      padding: 10px;
      font-size: 9px;
      vertical-align: top;
    }

    tbody tr:nth-child(even) td {
      background: #fafafa;
    }

    tbody td strong,
    tbody td small {
      display: block;
    }

    tbody td strong {
      color: var(--navy);
      font-size: 9.5px;
      margin-bottom: 3px;
    }

    tbody td small {
      color: var(--muted);
      font-size: 8px;
      line-height: 1.4;
    }

    .col-description {
      width: 57%;
    }

    .col-qty {
      width: 10%;
    }

    .col-price {
      width: 16%;
    }

    .col-total {
      width: 17%;
    }

    .bottom {
      display: grid;
      grid-template-columns: 1fr 65mm;
      gap: 15mm;
      margin-top: 9mm;
    }

    .notes p {
      color: var(--muted);
      font-size: 8.5px;
      line-height: 1.55;
      margin: 0 0 6px;
    }

    .summary {
      border-top: 2px solid var(--navy);
      padding-top: 3mm;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      color: var(--muted);
      font-size: 9px;
      padding: 3px 0;
    }

    .summary-row strong {
      color: var(--text);
    }

    .summary-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 5px;
      padding: 10px 0 0;
      border-top: 1px solid var(--line);
      color: var(--navy);
      font-size: 11px;
      font-weight: 800;
    }

    .summary-total strong {
      color: var(--gold);
      font-size: 18px;
    }

    /* Condizioni di fornitura */
    .conditions {
      margin-top: 9mm;
      padding: 5mm 6mm;
      border: 1px solid var(--line);
      border-left: 3px solid var(--gold);
      background: var(--soft);
      page-break-inside: avoid;
    }

    .conditions-title {
      color: var(--navy);
      font-size: 11px;
      font-weight: 800;
      margin: 0 0 4mm;
    }

    .conditions ul {
      margin: 0;
      padding-left: 5mm;
    }

    .conditions li {
      color: var(--muted);
      font-size: 8.5px;
      line-height: 1.55;
      margin-bottom: 2px;
    }

    .conditions li:last-child {
      margin-bottom: 0;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18mm;
      margin-top: 10mm;
      page-break-inside: avoid;
    }

    .signature-box {
      min-height: 30mm;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .signature-title {
      color: var(--navy);
      font-size: 9px;
      font-weight: 800;
      margin-bottom: 16mm;
    }

    .signature-line {
      border-bottom: 1px solid var(--navy);
      width: 100%;
      height: 1px;
    }

    .signature-caption {
      color: var(--muted);
      font-size: 7.5px;
      margin-top: 2mm;
    }

    .footer {
      margin-top: auto;
      padding-top: 8mm;
      border-top: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 15mm;
      color: var(--muted);
      font-size: 7.5px;
    }

    .footer strong,
    .footer span {
      display: block;
    }

    .footer strong {
      color: var(--navy);
      font-size: 9px;
      margin-bottom: 2px;
    }

    .footer-right {
      text-align: right;
    }

    @media print {
      body {
        padding: 0;
        background: white;
      }

      .page {
        margin: 0;
      }
    }

    @media screen {
      .page {
        box-shadow: 0 8px 30px rgba(0, 0, 0, .12);
      }
    }
`;
