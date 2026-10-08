// Stile (CSS) del PDF del biglietto da visita. Il contenuto è in templateBiglietto.ts
export const CSS = `
  @page { size: 85mm 55mm; margin: 0; }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  html, body { background: #ffffff; color: #0f172a; }

  /* Ogni lato occupa una pagina intera da 85 x 55 mm */
  .business-card {
    width: 85mm;
    height: 55mm;
    background: #ffffff;
    padding: 4.5mm;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .business-card:last-child { page-break-after: auto; break-after: auto; }

  .business-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1mm;
    background: linear-gradient(90deg, #b45309 0%, #f59e0b 50%, #b45309 100%);
  }

  /* FRONTE */
  .front { align-items: center; justify-content: center; text-align: center; }
  .logo-img-front { width: 26mm; height: 26mm; object-fit: contain; }
  .brand-subtitle-front {
    margin-top: 1.5mm;
    font-size: 8.5px;
    color: #475569;
    font-weight: 700;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    border-top: 1px solid #e2e8f0;
    padding-top: 1.5mm;
    width: 85%;
  }

  /* RETRO */
  .back-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2mm;
    gap: 2mm;
  }
  .logo-img-small { width: 10.5mm; height: 10.5mm; object-fit: contain; }
  .person-name {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }
  .person-title {
    font-size: 8px;
    color: #b45309;
    font-weight: 700;
    text-transform: uppercase;
  }

  .details-list { display: flex; flex-direction: column; gap: 1.2mm; margin: 1.5mm 0; }
  .detail-item {
    font-size: 9px;
    color: #334155;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 1.5mm;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .detail-item .icon { font-size: 9.5px; width: 3.5mm; text-align: center; }

  .legal-footer {
    font-size: 7px;
    color: #64748b;
    border-top: 1px solid #f1f5f9;
    padding-top: 1.5mm;
    display: flex;
    justify-content: space-between;
    gap: 2mm;
    font-family: monospace;
    font-weight: 600;
  }
`;
