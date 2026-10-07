import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { sottoscriviDatiAggiornati } from '../services/eventiSync';

// Carica i dati di una schermata:
// - ogni volta che la schermata diventa visibile (come useFocusEffect)
// - e, finché resta visibile, ogni volta che la sincronizzazione porta
//   dati nuovi dal server (es. un preventivo creato su un altro telefono)
//
// Uso:
//   useCaricaQuandoVisibile(() => {
//     getClienti().then(setClienti);
//   });
//
// Perché un ref: la funzione "carica" viene ricreata a ogni render.
// Se la mettessimo tra le dipendenze, l'effetto ripartirebbe a ogni render
// (e caricare i dati provoca un render: un ciclo infinito). Il ref contiene
// sempre l'ultima versione, e l'effetto la legge da lì senza dipenderne.
//
// Perché non le dipendenze di useCallback: con il React Compiler attivo
// le dipendenze vengono ricalcolate da quello che la funzione usa davvero,
// quindi una dipendenza "di comodo" non usata nel corpo viene ignorata.
export function useCaricaQuandoVisibile(carica: () => void): void {
  const caricaRef = useRef(carica);

  useEffect(() => {
    caricaRef.current = carica;
  });

  useFocusEffect(
    useCallback(() => {
      const ricarica = () => caricaRef.current();

      // 1. La schermata è appena diventata visibile: carica subito
      ricarica();

      // 2. Finché è visibile, ricarica a ogni arrivo di dati nuovi.
      //    Quando la schermata non è più visibile, useFocusEffect chiama
      //    la funzione restituita qui e l'iscrizione viene annullata.
      return sottoscriviDatiAggiornati(ricarica);
    }, [])
  );
}
