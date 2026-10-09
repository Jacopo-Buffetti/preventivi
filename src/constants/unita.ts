// =====================================================================
// UNITÀ DI MISURA DELLE VOCI
// =====================================================================
// Nel database si salva solo l'id (es. "m2"); il resto serve a mostrarla:
// - nome:   sul pulsante da scegliere ("m²")
// - prezzo: accanto al prezzo di una voce rapida ("€ 18,00 al m²")
// - sigla:  dopo la quantità, nel preventivo e nel PDF ("12 m²")
//
// "a corpo" non ha sigla: è un prezzo per tutto il lavoro, la quantità
// resta un numero semplice.
// Un id sconosciuto (per esempio salvato da una versione futura dell'app)
// viene trattato come "nessuna unità".
// =====================================================================

export interface Unita {
  id: string;
  nome: string;
  prezzo: string;
  sigla: string;
}

export const UNITA: Unita[] = [
  { id: 'corpo', nome: 'a corpo', prezzo: 'a corpo', sigla: '' },
  { id: 'ora', nome: 'ora', prezzo: "all'ora", sigla: 'h' },
  { id: 'pezzo', nome: 'pezzo', prezzo: 'al pezzo', sigla: 'pz' },
  { id: 'm', nome: 'm', prezzo: 'al m', sigla: 'm' },
  { id: 'm2', nome: 'm²', prezzo: 'al m²', sigla: 'm²' },
  { id: 'kg', nome: 'kg', prezzo: 'al kg', sigla: 'kg' },
  { id: 'km', nome: 'km', prezzo: 'al km', sigla: 'km' },
];

export function trovaUnita(id: string | null | undefined): Unita | null {
  return UNITA.find((u) => u.id === id) ?? null;
}

// Quantità con la sua sigla: (12, "m2") → "12 m²"; (2, null) → "2"
export function quantitaConUnita(
  quantita: number,
  unita: string | null | undefined
): string {
  const numero = quantita.toLocaleString('it-IT');
  const sigla = trovaUnita(unita)?.sigla;
  return sigla ? `${numero} ${sigla}` : numero;
}
