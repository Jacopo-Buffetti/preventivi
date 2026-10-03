// Voci rapide proposte quando si aggiunge una voce di costo.
// Sono esempi: modifica descrizioni e prezzi in base ai tuoi listini.
// In futuro questo elenco potrà stare in una tabella del database.

export interface VoceListino {
  descrizione: string;
  prezzo: number;
}

export const LISTINO: VoceListino[] = [
  { descrizione: 'Manodopera (ora)', prezzo: 35 },
  { descrizione: 'Posa in opera e trasporto', prezzo: 150 },
  { descrizione: 'Sopralluogo e rilievo misure', prezzo: 50 },
  { descrizione: 'Verniciatura a polvere', prezzo: 300 },
];
