// =====================================================================
// IVA E MARCA DA BOLLO
// =====================================================================
// Si scelgono nel Profilo (sezione Preventivi) e valgono per i preventivi
// NUOVI: ognuno si salva con la sua aliquota e il suo bollo, così
// cambiare le impostazioni non modifica i preventivi già fatti.
// =====================================================================

// Aliquota proposta finché l'utente non ne sceglie un'altra
export const ALIQUOTA_IVA_PREDEFINITA = 22;

// Le aliquote tra cui scegliere. 0 = operazione senza IVA, tipicamente
// il regime forfettario: nel PDF compare la DICITURA_SENZA_IVA.
export const ALIQUOTE_IVA = [22, 10, 5, 4, 0];

// Testo obbligatorio sui documenti del regime forfettario
export const DICITURA_SENZA_IVA =
  "Operazione effettuata ai sensi dell'articolo 1, commi da 54 a 89, della Legge n. 190/2014 e successive modificazioni. Prestazione non soggetta ad IVA.";

// Marca da bollo: importo aggiunto al totale quando è attiva
export const IMPORTO_MARCA_BOLLO = 2;

// Etichette dei totali, uguali in tutta l'app.
// "Totale con IVA" solo se l'IVA c'è davvero.
export function etichettaTotaleConIva(aliquotaIva: number): string {
  return aliquotaIva > 0 ? 'Totale con IVA' : 'Totale';
}

// Il totale da pagare, come si chiama in fondo alla pagina:
// con il bollo è un "Totale" e basta (non è più solo il prezzo con IVA)
export function etichettaTotaleFinale(
  aliquotaIva: number,
  sconto: number,
  marcaBollo: number
): string {
  if (marcaBollo > 0) return 'Totale';
  if (sconto > 0) return 'Totale arrotondato';
  return etichettaTotaleConIva(aliquotaIva);
}
