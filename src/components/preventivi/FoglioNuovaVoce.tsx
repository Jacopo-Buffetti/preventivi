import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LISTINO } from '../../constants/listino';
import { FONT, useTema, type Tema } from '../../constants/tema';
import { formattaEuro, leggiNumero } from '../../utils/formato';
import { FoglioInBasso } from '../ui/FoglioInBasso';

export interface NuovaVoce {
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
}

interface Props {
  visibile: boolean;
  onChiudi: () => void;
  onAggiungi: (voce: NuovaVoce) => void;
  // Se presente, il foglio serve a modificare questa voce invece di crearne una nuova
  voceDaModificare?: NuovaVoce | null;
}

// Foglio che sale dal basso per inserire o modificare una voce di costo
export function FoglioNuovaVoce({
  visibile,
  onChiudi,
  onAggiungi,
  voceDaModificare,
}: Props) {
  const t = useTema();

  const [listinoScelto, setListinoScelto] = useState<number | null>(null);
  const [descrizione, setDescrizione] = useState('');
  const [quantita, setQuantita] = useState('1');
  const [prezzo, setPrezzo] = useState('');

  const inModifica = !!voceDaModificare;

  // Ogni volta che il foglio si apre, il form riparte vuoto
  // oppure con i dati della voce da modificare
  useEffect(() => {
    if (!visibile) return;
    setListinoScelto(null);
    if (voceDaModificare) {
      setDescrizione(voceDaModificare.descrizione);
      setQuantita(String(voceDaModificare.quantita).replace('.', ','));
      setPrezzo(String(voceDaModificare.prezzo_unitario).replace('.', ','));
    } else {
      setDescrizione('');
      setQuantita('1');
      setPrezzo('');
    }
  }, [visibile, voceDaModificare]);

  const q = leggiNumero(quantita);
  const pu = leggiNumero(prezzo);
  const subtotale = q !== null && pu !== null ? q * pu : 0;
  const valida =
    descrizione.trim() !== '' && q !== null && q > 0 && pu !== null && pu >= 0;

  const scegliDaListino = (indice: number | null) => {
    setListinoScelto(indice);
    if (indice === null) {
      setDescrizione('');
      setPrezzo('');
      return;
    }
    const voce = LISTINO[indice];
    setDescrizione(voce.descrizione);
    setPrezzo(String(voce.prezzo).replace('.', ','));
  };

  const conferma = () => {
    if (!valida) return;
    onAggiungi({
      descrizione: descrizione.trim(),
      quantita: q!,
      prezzo_unitario: pu!,
    });
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
        {/* Il listino serve solo per le voci nuove */}
        {!inModifica && (
          <>
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              Dal listino rapido
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled"
            >
              <Chip
                t={t}
                testo="Voce libera"
                attivo={listinoScelto === null}
                onPress={() => scegliDaListino(null)}
              />
              {LISTINO.map((voce, i) => (
                <Chip
                  key={voce.descrizione}
                  t={t}
                  testo={voce.descrizione}
                  attivo={listinoScelto === i}
                  onPress={() => scegliDaListino(i)}
                />
              ))}
            </ScrollView>
          </>
        )}

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          Descrizione
        </Text>
        <TextInput
          value={descrizione}
          onChangeText={setDescrizione}
          placeholder="es. Posa in opera e trasporto"
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

        <Pressable
          onPress={conferma}
          disabled={!valida}
          style={({ pressed }) => [
            styles.bottone,
            { backgroundColor: t.bottonePrimario },
            !valida && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !valida }}
        >
          <Text style={[styles.bottoneTesto, { color: t.testoSuPrimario }]}>
            {inModifica ? 'Salva la voce' : 'Aggiungi al preventivo'}
          </Text>
        </Pressable>
      </ScrollView>
    </FoglioInBasso>
  );
}

function Chip({
  t,
  testo,
  attivo,
  onPress,
}: {
  t: Tema;
  testo: string;
  attivo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: attivo ? t.bottonePrimario : t.inputFoglio,
          borderColor: attivo ? t.bottonePrimario : t.bordo,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: attivo }}
    >
      <Text
        style={[
          styles.chipTesto,
          {
            color: attivo ? t.testoSuPrimario : t.testo,
            fontFamily: attivo ? FONT.grassetto : FONT.semi,
          },
        ]}
      >
        {testo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  etichetta: {
    fontSize: 13,
    fontFamily: FONT.grassetto,
    marginTop: 14,
    marginBottom: 6,
  },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    height: 36,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  chipTesto: { fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONT.regolare,
  },
  cifre: { fontVariant: ['tabular-nums'] },
  affiancati: { flexDirection: 'row', gap: 12 },
  colonnaStretta: { flex: 2 },
  colonnaLarga: { flex: 3 },
  subtotale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  subtotaleEtichetta: { fontSize: 14, fontFamily: FONT.semi },
  subtotaleValore: {
    fontSize: 18,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  bottone: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  bottoneTesto: { fontSize: 16, fontFamily: FONT.pieno },
  disabilitato: { opacity: 0.45 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
