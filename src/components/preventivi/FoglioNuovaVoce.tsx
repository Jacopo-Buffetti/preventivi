import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTema } from '../../constants/tema';
import { trovaUnita } from '../../constants/unita';
import {
  creaVoceRapida,
  esisteVoceRapida,
  getVociRapide,
  type VoceRapida,
} from '../../services/vociRapideService';
import { formattaEuro, leggiNumero } from '../../utils/formato';
import { Chip } from '../ui/Chip';
import { FoglioInBasso } from '../ui/FoglioInBasso';
import { styles } from './FoglioNuovaVoce.styles';
import { SceltaUnita } from './SceltaUnita';

export interface NuovaVoce {
  descrizione: string;
  quantita: number;
  unita: string | null; // id da constants/unita.ts
  prezzo_unitario: number;
}

interface Props {
  visibile: boolean;
  onChiudi: () => void;
  onAggiungi: (voce: NuovaVoce) => void;
  // Porta alla gestione delle voci rapide. Il foglio si chiude prima.
  onGestisciVociRapide: () => void;
  // Se presente, il foglio serve a modificare questa voce invece di crearne una nuova
  voceDaModificare?: NuovaVoce | null;
}

// Foglio che sale dal basso per inserire o modificare una voce di costo.
// Per le voci nuove propone le VOCI RAPIDE dell'utente (vedi
// vociRapideService.ts) e permette di salvare tra quelle una voce
// scritta a mano.
export function FoglioNuovaVoce({
  visibile,
  onChiudi,
  onAggiungi,
  onGestisciVociRapide,
  voceDaModificare,
}: Props) {
  const t = useTema();

  const [vociRapide, setVociRapide] = useState<VoceRapida[]>([]);
  const [rapidaScelta, setRapidaScelta] = useState<string | null>(null);
  const [descrizione, setDescrizione] = useState('');
  const [quantita, setQuantita] = useState('1');
  const [unita, setUnita] = useState<string | null>(null);
  const [prezzo, setPrezzo] = useState('');
  const [salvaTraRapide, setSalvaTraRapide] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const inModifica = !!voceDaModificare;

  // Ogni volta che il foglio si apre, il form riparte vuoto
  // oppure con i dati della voce da modificare.
  // Le voci rapide si rileggono a ogni apertura: potrebbero essere
  // cambiate nel frattempo (dal Profilo o da un altro dispositivo).
  useEffect(() => {
    if (!visibile) return;
    setRapidaScelta(null);
    setSalvaTraRapide(false);
    if (voceDaModificare) {
      setDescrizione(voceDaModificare.descrizione);
      setQuantita(numeroInTesto(voceDaModificare.quantita));
      setUnita(voceDaModificare.unita);
      setPrezzo(numeroInTesto(voceDaModificare.prezzo_unitario));
    } else {
      setDescrizione('');
      setQuantita('1');
      setUnita(null);
      setPrezzo('');
      getVociRapide()
        .then(setVociRapide)
        .catch((err) => console.error('Voci rapide non lette:', err));
    }
  }, [visibile, voceDaModificare]);

  const q = leggiNumero(quantita);
  const pu = leggiNumero(prezzo);
  const subtotale = q !== null && pu !== null ? q * pu : 0;
  const valida =
    descrizione.trim() !== '' && q !== null && q > 0 && pu !== null && pu >= 0;

  // L'interruttore "Salva tra le voci rapide" ha senso solo per una voce
  // nuova scritta a mano: una voce rapida scelta esiste già
  const puoSalvareTraRapide = !inModifica && rapidaScelta === null;

  const scegliRapida = (voce: VoceRapida | null) => {
    setRapidaScelta(voce?.id ?? null);
    if (!voce) {
      setDescrizione('');
      setQuantita('1');
      setUnita(null);
      setPrezzo('');
      return;
    }
    setDescrizione(voce.descrizione);
    setQuantita(numeroInTesto(voce.quantita));
    setUnita(trovaUnita(voce.unita)?.id ?? null);
    setPrezzo(numeroInTesto(voce.prezzo));
    setSalvaTraRapide(false);
  };

  const conferma = async () => {
    if (!valida || salvando) return;
    const voce: NuovaVoce = {
      descrizione: descrizione.trim(),
      quantita: q!,
      unita,
      prezzo_unitario: pu!,
    };

    // Se richiesto, la voce diventa anche una voce rapida. Un problema qui
    // non deve impedire di aggiungerla al preventivo: si avvisa in console
    // e si va avanti. Niente doppioni: se c'è già, non se ne crea un'altra.
    if (puoSalvareTraRapide && salvaTraRapide) {
      try {
        setSalvando(true);
        if (!(await esisteVoceRapida(voce.descrizione))) {
          await creaVoceRapida({
            descrizione: voce.descrizione,
            prezzo: voce.prezzo_unitario,
            quantita: voce.quantita,
            unita: voce.unita,
          });
        }
      } catch (err) {
        console.error('Voce rapida non salvata:', err);
      } finally {
        setSalvando(false);
      }
    }

    onAggiungi(voce);
  };

  const stileInput = [
    styles.input,
    { backgroundColor: t.inputFoglio, borderColor: t.bordo, color: t.testo },
  ];

  return (
    <FoglioInBasso
      visibile={visibile}
      titolo={inModifica ? 'Modifica voce' : 'Aggiungi una voce'}
      onChiudi={onChiudi}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Le voci rapide servono solo per le voci nuove */}
        {!inModifica && (
          <>
            <View style={styles.rigaEtichetta}>
              <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
                Le tue voci rapide
              </Text>
              <Pressable
                onPress={onGestisciVociRapide}
                hitSlop={10}
                accessibilityRole="link"
                accessibilityLabel="Gestisci le voci rapide"
              >
                <Text style={[styles.gestisci, { color: t.accento }]}>
                  {vociRapide.length > 0 ? 'Gestisci' : 'Crea'}
                </Text>
              </Pressable>
            </View>

            {vociRapide.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
                keyboardShouldPersistTaps="handled"
              >
                <Chip
                  testo="Voce libera"
                  attivo={rapidaScelta === null}
                  onPress={() => scegliRapida(null)}
                />
                {vociRapide.map((voce) => (
                  <Chip
                    key={voce.id}
                    testo={voce.descrizione}
                    attivo={rapidaScelta === voce.id}
                    onPress={() => scegliRapida(voce)}
                  />
                ))}
              </ScrollView>
            ) : (
              <Text
                style={[styles.nessunaRapida, { color: t.testoSecondario }]}
              >
                Non hai ancora voci rapide: sono i lavori e i materiali che usi
                spesso, pronti con il tuo prezzo.
              </Text>
            )}
          </>
        )}

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          Descrizione
        </Text>
        <TextInput
          value={descrizione}
          onChangeText={(testo) => {
            setDescrizione(testo);
            // Una voce rapida ritoccata nella descrizione diventa una voce
            // libera: si può salvare come nuova voce rapida
            if (rapidaScelta !== null) setRapidaScelta(null);
          }}
          placeholder="es. Smontaggio e smaltimento"
          placeholderTextColor={t.testoSecondario}
          style={stileInput}
          returnKeyType="next"
          accessibilityLabel="Descrizione"
        />

        {/* Quantità e prezzo affiancati: si leggono come "2 × 35 €" */}
        <View style={styles.affiancati}>
          <View style={styles.colonnaStretta}>
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              Quantità
            </Text>
            <TextInput
              value={quantita}
              onChangeText={setQuantita}
              keyboardType="decimal-pad"
              style={[...stileInput, styles.cifre]}
              selectTextOnFocus
              accessibilityLabel="Quantità"
            />
          </View>
          <View style={styles.colonnaLarga}>
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              Prezzo unitario (€)
            </Text>
            <TextInput
              value={prezzo}
              onChangeText={setPrezzo}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={t.testoSecondario}
              style={[...stileInput, styles.cifre]}
              accessibilityLabel="Prezzo unitario in euro"
            />
          </View>
        </View>

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          Unità (facoltativa)
        </Text>
        <SceltaUnita valore={unita} onCambia={setUnita} />

        <View style={[styles.subtotale, { backgroundColor: t.riquadro }]}>
          <Text
            style={[styles.subtotaleEtichetta, { color: t.testoSecondario }]}
          >
            Totale della riga
          </Text>
          <Text style={[styles.subtotaleValore, { color: t.testo }]}>
            {formattaEuro(subtotale)}
          </Text>
        </View>

        {puoSalvareTraRapide && (
          <View style={styles.rigaInterruttore}>
            <View style={styles.testiInterruttore}>
              <Text style={[styles.titoloInterruttore, { color: t.testo }]}>
                Salva tra le voci rapide
              </Text>
              <Text
                style={[styles.sottoInterruttore, { color: t.testoSecondario }]}
              >
                La ritrovi pronta nel prossimo preventivo
              </Text>
            </View>
            <Switch
              value={salvaTraRapide}
              onValueChange={setSalvaTraRapide}
              trackColor={{ false: t.bordo, true: t.bottonePrimario }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={t.bordo}
              accessibilityLabel="Salva tra le voci rapide"
            />
          </View>
        )}

        <Pressable
          onPress={conferma}
          disabled={!valida || salvando}
          style={({ pressed }) => [
            styles.bottone,
            { backgroundColor: t.bottonePrimario },
            (!valida || salvando) && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !valida || salvando }}
        >
          <Text style={[styles.bottoneTesto, { color: t.testoSuPrimario }]}>
            {inModifica ? 'Salva la voce' : 'Aggiungi al preventivo'}
          </Text>
        </Pressable>
      </ScrollView>
    </FoglioInBasso>
  );
}

// 35 → "35", 18.5 → "18,5": come lo scriverebbe l'utente
function numeroInTesto(valore: number): string {
  return String(valore).replace('.', ',');
}
