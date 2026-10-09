import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { styles } from './ListaRiordinabile.styles';

// =====================================================================
// LISTA RIORDINABILE
// =====================================================================
// Elenco in cui le righe si spostano tenendole premute e trascinandole.
// - tocco breve: onTocca (es. apre la modifica)
// - tocco lungo e trascinamento: la riga si solleva e segue il dito, le
//   altre si spostano per farle posto; al rilascio onRiordina riceve il
//   nuovo ordine (gli id, dal primo all'ultimo)
//
// Tutte le righe hanno la stessa altezza (altezzaRiga): così la posizione
// di ognuna è semplicemente indice × passo, e capire su quale posto si
// trova il dito è una divisione.
//
// Il movimento gira sul thread dell'interfaccia (Reanimated), non su
// quello di JavaScript: resta fluido anche mentre l'app lavora.
//
// Va messa dentro un GestureHandlerRootView (ce l'ha la schermata che la
// usa). Durante il trascinamento conviene bloccare lo scorrimento della
// pagina: onTrascinamento avvisa quando inizia e quando finisce.
// =====================================================================

const SPAZIO = 8; // distanza tra una riga e l'altra
const DURATA = 180;

interface Props<T extends { id: string }> {
  elementi: T[];
  altezzaRiga: number;
  renderRiga: (elemento: T) => ReactNode;
  onTocca: (elemento: T) => void;
  onRiordina: (ids: string[]) => void;
  onTrascinamento?: (attivo: boolean) => void;
}

export function ListaRiordinabile<T extends { id: string }>({
  elementi,
  altezzaRiga,
  renderRiga,
  onTocca,
  onRiordina,
  onTrascinamento,
}: Props<T>) {
  const passo = altezzaRiga + SPAZIO;

  // Posto attuale di ogni riga: { id: indice }. Condiviso da tutte le
  // righe, che lo leggono e lo cambiano durante il trascinamento.
  const posizioni = useSharedValue<Record<string, number>>(indiciDi(elementi));

  // Quando arriva un elenco nuovo (salvataggio, sincronizzazione) i posti
  // ripartono da lì
  useEffect(() => {
    posizioni.value = indiciDi(elementi);
  }, [elementi, posizioni]);

  const fine = (finali: Record<string, number>) => {
    onTrascinamento?.(false);
    const ids = Object.keys(finali).sort((a, b) => finali[a] - finali[b]);
    const prima = elementi.map((e) => e.id);
    if (ids.some((id, i) => id !== prima[i])) onRiordina(ids);
  };

  const tocca = (id: string) => {
    const elemento = elementi.find((e) => e.id === id);
    if (elemento) onTocca(elemento);
  };

  const inizio = () => onTrascinamento?.(true);

  return (
    <View style={{ height: Math.max(0, elementi.length * passo - SPAZIO) }}>
      {elementi.map((elemento, indice) => (
        <Riga
          key={elemento.id}
          id={elemento.id}
          indiceIniziale={indice}
          totale={elementi.length}
          passo={passo}
          altezza={altezzaRiga}
          posizioni={posizioni}
          onInizio={inizio}
          onFine={fine}
          onTocca={tocca}
        >
          {renderRiga(elemento)}
        </Riga>
      ))}
    </View>
  );
}

function Riga({
  id,
  indiceIniziale,
  totale,
  passo,
  altezza,
  posizioni,
  onInizio,
  onFine,
  onTocca,
  children,
}: {
  id: string;
  indiceIniziale: number;
  totale: number;
  passo: number;
  altezza: number;
  posizioni: SharedValue<Record<string, number>>;
  onInizio: () => void;
  onFine: (finali: Record<string, number>) => void;
  onTocca: (id: string) => void;
  children: ReactNode;
}) {
  const y = useSharedValue(indiceIniziale * passo);
  const partenza = useSharedValue(0);
  const sollevata = useSharedValue(false);

  // Quando il posto di questa riga cambia (perché un'altra le passa
  // sopra), scivola nel posto nuovo. Quella sollevata segue il dito.
  useAnimatedReaction(
    () => posizioni.value[id],
    (posto, precedente) => {
      if (posto === undefined || posto === precedente || sollevata.value) {
        return;
      }
      y.value = withTiming(posto * passo, { duration: DURATA });
    }
  );

  const trascina = Gesture.Pan()
    .activateAfterLongPress(280)
    .onStart(() => {
      sollevata.value = true;
      partenza.value = y.value;
      scheduleOnRN(onInizio);
    })
    .onUpdate((e) => {
      const massimo = (totale - 1) * passo;
      y.value = Math.min(Math.max(partenza.value + e.translationY, 0), massimo);

      // Il posto sotto il centro della riga: se è cambiato, la riga che
      // lo occupava prende il posto lasciato libero
      const nuovo = Math.round(y.value / passo);
      const attuale = posizioni.value[id];
      if (nuovo !== attuale) {
        const aggiornate: Record<string, number> = {};
        for (const chiave in posizioni.value) {
          const posto = posizioni.value[chiave];
          aggiornate[chiave] = posto === nuovo ? attuale : posto;
        }
        aggiornate[id] = nuovo;
        posizioni.value = aggiornate;
      }
    })
    .onFinalize(() => {
      if (!sollevata.value) return;
      sollevata.value = false;
      y.value = withTiming(posizioni.value[id] * passo, { duration: DURATA });
      scheduleOnRN(onFine, posizioni.value);
    });

  const tocco = Gesture.Tap()
    .maxDuration(260)
    .onEnd((_e, riuscito) => {
      if (riuscito) scheduleOnRN(onTocca, id);
    });

  // Vince il primo dei due che si attiva: un tocco breve è un tocco,
  // un tocco lungo diventa trascinamento
  const gesto = Gesture.Race(trascina, tocco);

  const stile = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { scale: withTiming(sollevata.value ? 1.03 : 1, { duration: 120 }) },
    ],
    zIndex: sollevata.value ? 10 : 0,
    elevation: sollevata.value ? 8 : 0,
    shadowOpacity: withTiming(sollevata.value ? 0.35 : 0, { duration: 120 }),
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View style={[styles.riga, { height: altezza }, stile]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

function indiciDi(elementi: { id: string }[]): Record<string, number> {
  const indici: Record<string, number> = {};
  elementi.forEach((e, i) => {
    indici[e.id] = i;
  });
  return indici;
}
