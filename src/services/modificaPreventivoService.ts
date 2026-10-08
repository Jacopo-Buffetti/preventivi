import { adesso, getDbConnection } from './db';
import { segnalaModificaLocale } from './eventiSync';
import { nuovoId } from './id';
import { scontoValido, type PreventivoInput } from './databaseService';

// Aggiorna un preventivo esistente con le sue voci.
// Restano invariati numero, anno, data di emissione e stato: cambiano cliente,
// oggetto, note, voci, sconto di arrotondamento e totali. Le voci vecchie vengono sostituite da quelle nuove.
// Il preventivo viene marcato da sincronizzare: le voci non hanno un flag
// proprio, viaggiano sempre insieme al loro preventivo.
export async function updatePreventivoWithVoci(
  idPreventivo: string,
  input: PreventivoInput
): Promise<void> {
  const db = await getDbConnection();
  const aliquotaIva = input.aliquota_iva ?? 22;

  let imponibile = 0;
  const vociCalcolate = input.voci.map((v) => {
    const totaleVoce = v.quantita * v.prezzo_unitario;
    imponibile += totaleVoce;
    return { ...v, totaleVoce };
  });
  const totaleIva = (imponibile * aliquotaIva) / 100;
  const sconto = scontoValido(input.sconto, imponibile + totaleIva);
  const totaleGenerale = imponibile + totaleIva - sconto;

  // Tutto in una transazione: o si salva tutto, o non cambia niente
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE preventivi
       SET cliente_id = ?, oggetto = ?, aliquota_iva = ?, note_pagamento = ?,
           totale_imponibile = ?, totale_iva = ?, sconto = ?, totale_generale = ?,
           updated_at = ?, da_sincronizzare = 1
       WHERE id = ?;`,
      [
        input.cliente_id,
        input.oggetto || '',
        aliquotaIva,
        input.note_pagamento || '',
        imponibile,
        totaleIva,
        sconto,
        totaleGenerale,
        adesso(),
        idPreventivo,
      ]
    );

    await db.runAsync('DELETE FROM voci_preventivo WHERE preventivo_id = ?;', [
      idPreventivo,
    ]);

    for (const voce of vociCalcolate) {
      const voceId = nuovoId();
      await db.runAsync(
        `INSERT INTO voci_preventivo (id, preventivo_id, descrizione, quantita, prezzo_unitario, totale_voce)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          voceId,
          idPreventivo,
          voce.descrizione,
          voce.quantita,
          voce.prezzo_unitario,
          voce.totaleVoce,
        ]
      );
    }
  });
  segnalaModificaLocale();
}
