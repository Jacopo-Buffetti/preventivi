import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LISTINO } from '../../constants/listino';
import { useTema } from '../../constants/tema';
import { formattaEuro, leggiNumero } from '../../utils/formato';

export interface NuovaVoce {
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
}

interface Props {
  visibile: boolean;
  onChiudi: () => void;
  onAggiungi: (voce: NuovaVoce) => void;
}

// Foglio che sale dal basso per inserire una voce di costo
export function FoglioNuovaVoce({ visibile, onChiudi, onAggiungi }: Props) {
  const t = useTema();
  const insets = useSafeAreaInsets();

  const [listinoScelto, setListinoScelto] = useState<number | null>(null);
  const [descrizione, setDescrizione] = useState('');
  const [quantita, setQuantita] = useState('1');
  const [prezzo, setPrezzo] = useState('');

  // Ogni volta che il foglio si apre, il form riparte vuoto
  useEffect(() => {
    if (visibile) {
      setListinoScelto(null);
      setDescrizione('');
      setQuantita('1');
      setPrezzo('');
    }
  }, [visibile]);

  const q = leggiNumero(quantita);
  const pu = leggiNumero(prezzo);
  const subtotale = q !== null && pu !== null ? q * pu : 0;
  const valida = descrizione.trim() !== '' && q !== null && q > 0 && pu !== null && pu >= 0;

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
    onAggiungi({ descrizione: descrizione.trim(), quantita: q!, prezzo_unitario: pu! });
  };

  const stileInput = [
    styles.input,
    { backgroundColor: t.inputFoglio, borderColor: t.bordo, color: t.testo },
  ];

  return (
    <Modal visible={visibile} transparent animationType="slide" onRequestClose={onChiudi}>
      <KeyboardAvoidingView
        style={styles.contenitore}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tocco sullo sfondo scuro: chiude il foglio */}
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}
          onPress={onChiudi}
          accessibilityLabel="Chiudi"
        />

        <View
          style={[
            styles.foglio,
            {
              backgroundColor: t.card,
              borderColor: t.accento,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={[styles.maniglia, { backgroundColor: t.bordo }]} />

          <View style={styles.testa}>
            <Text style={[styles.titolo, { color: t.accento }]}>Aggiungi Voce di Costo</Text>
            <Pressable onPress={onChiudi} hitSlop={12} accessibilityRole="button" accessibilityLabel="Chiudi">
              <Text style={[styles.chiudi, { color: t.testoSecondario }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              SELEZIONA DA LISTINO RAPIDO
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled"
            >
              <Chip
                testo="Voce personalizzata"
                attivo={listinoScelto === null}
                onPress={() => scegliDaListino(null)}
              />
              {LISTINO.map((voce, i) => (
                <Chip
                  key={voce.descrizione}
                  testo={voce.descrizione}
                  attivo={listinoScelto === i}
                  onPress={() => scegliDaListino(i)}
                />
              ))}
            </ScrollView>

            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              DESCRIZIONE LAVORAZIONE
            </Text>
            <TextInput
              value={descrizione}
              onChangeText={setDescrizione}
              placeholder="es. Posa in opera e trasporto"
              placeholderTextColor={t.testoSecondario}
              style={stileInput}
              returnKeyType="next"
            />

            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>Q.TÀ</Text>
            <TextInput
              value={quantita}
              onChangeText={setQuantita}
              keyboardType="decimal-pad"
              style={stileInput}
              selectTextOnFocus
            />

            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              PREZZO UNITARIO (€)
            </Text>
            <TextInput
              value={prezzo}
              onChangeText={setPrezzo}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={t.testoSecondario}
              style={stileInput}
            />

            <View style={styles.subtotale}>
              <Text style={[styles.subtotaleEtichetta, { color: t.testo }]}>Subtotale Riga:</Text>
              <Text style={[styles.subtotaleValore, { color: t.accento }]}>
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
            >
              <Text style={styles.bottoneTesto}>＋ Aggiungi al Preventivo</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Chip({ testo, attivo, onPress }: { testo: string; attivo: boolean; onPress: () => void }) {
  const t = useTema();
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
      <Text style={[styles.chipTesto, { color: attivo ? '#FFFFFF' : t.testo }]}>{testo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1, justifyContent: 'flex-end' },
  foglio: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  maniglia: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  testa: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titolo: { fontSize: 18, fontWeight: '800' },
  chiudi: { fontSize: 18, fontWeight: '700' },
  etichetta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 6,
  },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipTesto: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  subtotale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  subtotaleEtichetta: { fontSize: 15, fontWeight: '700' },
  subtotaleValore: { fontSize: 16, fontWeight: '800' },
  bottone: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  bottoneTesto: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  disabilitato: { opacity: 0.45 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
