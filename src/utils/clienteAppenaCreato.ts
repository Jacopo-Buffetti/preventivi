// Passaggio di un cliente appena creato al form del preventivo.
//
// Dal form del preventivo si può creare un cliente nuovo: si apre il form
// del cliente, si salva e si torna indietro. Tornando indietro però non si
// può "restituire" un valore alla pagina precedente. Il form del cliente
// lascia quindi qui l'id del cliente appena creato, e il form del
// preventivo, quando torna visibile, lo prende (una sola volta) e lo
// imposta come cliente scelto.

let idInAttesa: string | null = null;

export function segnaClienteCreato(id: string): void {
  idInAttesa = id;
}

// Restituisce l'id e lo cancella: così viene usato una volta sola
export function prendiClienteCreato(): string | null {
  const id = idInAttesa;
  idInAttesa = null;
  return id;
}
