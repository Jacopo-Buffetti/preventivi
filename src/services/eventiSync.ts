// =====================================================================
// EVENTI DELLA SINCRONIZZAZIONE
// =====================================================================
// Un piccolo sistema di "avvisi" tra parti dell'app che non devono
// conoscersi a vicenda (e non devono importarsi, per evitare import
// circolari):
//
// - MODIFICA LOCALE: i servizi del database avvisano "ho appena scritto
//   qualcosa". La sincronizzazione automatica ascolta e programma un push.
//
// - DATI AGGIORNATI: la sincronizzazione avvisa "ho ricevuto dati nuovi
//   dal server". Le schermate ascoltano e si ricaricano.
//
// Questo file non importa niente: è il punto d'incontro neutro.
// =====================================================================

type Ascoltatore = () => void;

// --- Modifiche locali ---

const ascoltatoriModifiche = new Set<Ascoltatore>();

export function segnalaModificaLocale(): void {
  ascoltatoriModifiche.forEach((f) => f());
}

export function sulleModificheLocali(f: Ascoltatore): () => void {
  ascoltatoriModifiche.add(f);
  return () => {
    ascoltatoriModifiche.delete(f);
  };
}

// --- Dati aggiornati dal server ---

// Un numero che cresce a ogni arrivo di dati nuovi. Le schermate lo usano
// come "versione": quando cambia, rileggono il database.
let versioneDati = 0;
const ascoltatoriDati = new Set<Ascoltatore>();

export function segnalaDatiAggiornati(): void {
  versioneDati++;
  ascoltatoriDati.forEach((f) => f());
}

export function sottoscriviDatiAggiornati(f: Ascoltatore): () => void {
  ascoltatoriDati.add(f);
  return () => {
    ascoltatoriDati.delete(f);
  };
}

export function leggiVersioneDati(): number {
  return versioneDati;
}
