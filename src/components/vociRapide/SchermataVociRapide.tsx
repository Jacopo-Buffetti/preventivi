import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../../constants/tema';
import { trovaUnita } from '../../constants/unita';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import {
  eliminaVoceRapida,
  getVociRapide,
  riordinaVociRapide,
  type VoceRapida,
} from '../../services/vociRapideService';
import { avviso, conferma } from '../../utils/dialoghi';
import { formattaEuro } from '../../utils/formato';
import { ListaRiordinabile } from '../ui/ListaRiordinabile';
import { FoglioVoceRapida } from './FoglioVoceRapida';
import { styles } from './SchermataVociRapide.styles';

const ALTEZZA_RIGA = 64;

interface Props {
  // Testo del pulsante per tornare indietro: "Profilo" o "Preventivo"
  etichettaIndietro: string;
}

// Gestione delle voci rapide: elenco nell'ordine scelto, con aggiunta,
// modifica, eliminazione e riordino trascinando.
// La stessa schermata si apre da due posti (Profilo e foglio "Aggiungi una
// voce" del preventivo): le due pagine in src/app la mostrano entrambe.
export function SchermataVociRapide({ etichettaIndietro }: Props) {
  const t = useTema();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [voci, setVoci] = useState<VoceRapida[]>([]);
  const [caricate, setCaricate] = useState(false);
  // Foglio di modifica: undefined = chiuso, null = nuova voce
  const [inModifica, setInModifica] = useState<VoceRapida | null | undefined>(
    undefined
  );
  const [trascinando, setTrascinando] = useState(false);

  const carica = () => {
    getVociRapide()
      .then(setVoci)
      .catch((err) => {
        console.error(err);
        avviso('Errore', 'Impossibile leggere le voci rapide.');
      })
      .finally(() => setCaricate(true));
  };

  useCaricaQuandoVisibile(carica);

  // Il nuovo ordine si vede subito; il salvataggio avviene dietro
  const riordina = (ids: string[]) => {
    const perId = new Map(voci.map((v) => [v.id, v]));
    setVoci(ids.map((id) => perId.get(id)!).filter(Boolean));
    riordinaVociRapide(ids).catch((err) => {
      console.error(err);
      avviso('Errore', 'Impossibile salvare il nuovo ordine.');
      carica();
    });
  };

  const salvata = () => {
    setInModifica(undefined);
    carica();
  };

  const elimina = async (voce: VoceRapida) => {
    setInModifica(undefined);
    // Il foglio si sta chiudendo: su iPhone una finestra di conferma
    // aperta in quel momento a volte non compare
    await new Promise((fatto) => setTimeout(fatto, 350));
    const ok = await conferma(
      `Eliminare "${voce.descrizione}"?`,
      "Non comparirà più tra le voci rapide. I preventivi in cui l'hai già usata restano come sono.",
      'Elimina',
      true
    );
    if (!ok) return;
    try {
      await eliminaVoceRapida(voce.id);
      carica();
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile eliminare la voce rapida.');
    }
  };

  return (
    <GestureHandlerRootView
      style={[styles.radice, { backgroundColor: t.sfondo }]}
    >
      <ScrollView
        scrollEnabled={!trascinando}
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 12 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Torna a ${etichettaIndietro}`}
          style={styles.indietro}
        >
          <Feather name="chevron-left" size={22} color={t.accento} />
          <Text style={[styles.indietroTesto, { color: t.accento }]}>
            {etichettaIndietro}
          </Text>
        </Pressable>

        <View style={styles.intestazione}>
          <Text
            style={[styles.titolo, { color: t.testo }]}
            accessibilityRole="header"
          >
            Voci rapide
          </Text>
          <Text style={[styles.sottotitolo, { color: t.testoSecondario }]}>
            Compaiono quando aggiungi una voce a un preventivo, in quest'ordine.
          </Text>
        </View>

        {caricate && voci.length === 0 ? (
          <View
            style={[
              styles.vuoto,
              { backgroundColor: t.card, borderColor: t.bordo },
            ]}
          >
            <View style={[styles.vuotoIcona, { backgroundColor: t.riquadro }]}>
              <Feather name="list" size={28} color={t.accento} />
            </View>
            <Text style={[styles.vuotoTitolo, { color: t.testo }]}>
              Nessuna voce rapida
            </Text>
            <Text style={[styles.vuotoTesto, { color: t.testoSecondario }]}>
              Aggiungi i lavori e i materiali che metti più spesso nei
              preventivi, con il tuo prezzo. Li ritrovi pronti ogni volta.
            </Text>
            <PulsanteNuova
              testo="Aggiungi la prima voce"
              onPress={() => setInModifica(null)}
            />
          </View>
        ) : (
          <>
            <ListaRiordinabile
              elementi={voci}
              altezzaRiga={ALTEZZA_RIGA}
              onTocca={(voce) => setInModifica(voce)}
              onRiordina={riordina}
              onTrascinamento={setTrascinando}
              renderRiga={(voce) => <RigaVoce voce={voce} />}
            />

            {voci.length > 0 && (
              <View style={styles.suggerimento}>
                <Feather name="info" size={15} color={t.testoSecondario} />
                <Text
                  style={[
                    styles.suggerimentoTesto,
                    { color: t.testoSecondario },
                  ]}
                >
                  Tocca una voce per modificarla. Tienila premuta e trascinala
                  per cambiare l'ordine.
                </Text>
              </View>
            )}

            {caricate && (
              <PulsanteNuova
                testo="Nuova voce rapida"
                onPress={() => setInModifica(null)}
              />
            )}
          </>
        )}
      </ScrollView>

      <FoglioVoceRapida
        visibile={inModifica !== undefined}
        voce={inModifica ?? null}
        onChiudi={() => setInModifica(undefined)}
        onSalvata={salvata}
        onElimina={elimina}
      />
    </GestureHandlerRootView>
  );
}

function RigaVoce({ voce }: { voce: VoceRapida }) {
  const t = useTema();
  const unita = trovaUnita(voce.unita);
  return (
    <View
      style={[styles.riga, { backgroundColor: t.card, borderColor: t.bordo }]}
    >
      <Feather name="menu" size={18} color={t.testoSecondario} />
      <Text
        style={[styles.rigaDescrizione, { color: t.testo }]}
        numberOfLines={1}
      >
        {voce.descrizione}
      </Text>
      <View style={styles.rigaPrezzo}>
        <Text style={[styles.rigaImporto, { color: t.testo }]}>
          {formattaEuro(voce.prezzo)}
        </Text>
        {unita && (
          <Text style={[styles.rigaUnita, { color: t.testoSecondario }]}>
            {unita.prezzo}
          </Text>
        )}
      </View>
    </View>
  );
}

function PulsanteNuova({
  testo,
  onPress,
}: {
  testo: string;
  onPress: () => void;
}) {
  const t = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.nuova,
        { backgroundColor: t.bottonePrimario },
        pressed && styles.premuto,
      ]}
    >
      <Feather name="plus" size={20} color={t.testoSuPrimario} />
      <Text style={[styles.nuovaTesto, { color: t.testoSuPrimario }]}>
        {testo}
      </Text>
    </Pressable>
  );
}
