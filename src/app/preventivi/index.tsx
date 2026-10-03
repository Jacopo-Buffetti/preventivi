import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STATI } from '../../constants/stati';
import { useTema, type Tema } from '../../constants/tema';
import {
  getAllPreventivi,
  type Preventivo,
} from '../../services/databaseService';
import { condividiPdfPreventivo } from '../../services/pdfService';
import { avviso } from '../../utils/dialoghi';
import {
  formattaData,
  formattaEuro,
  formattaNumeroPreventivo,
} from '../../utils/formato';

function numeroPreventivo(p: Preventivo): string {
  return formattaNumeroPreventivo(p.anno, p.numero_preventivo);
}

// --- SCHERMATA --------------------------------------------------------------

export default function PreventiviScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTema();

  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [ricerca, setRicerca] = useState('');

  // Ricarica la lista ogni volta che la pagina torna visibile (es. dopo un salvataggio)
  useFocusEffect(
    useCallback(() => {
      getAllPreventivi()
        .then(setPreventivi)
        .catch((err) => {
          console.error(err);
          avviso('Errore', 'Impossibile caricare i preventivi.');
        })
        .finally(() => setCaricamento(false));
    }, [])
  );

  const filtrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return preventivi;
    return preventivi.filter(
      (p) =>
        numeroPreventivo(p).includes(q) ||
        (p.cliente_nome ?? '').toLowerCase().includes(q) ||
        (p.oggetto ?? '').toLowerCase().includes(q)
    );
  }, [preventivi, ricerca]);

  const apriDettaglio = (p: Preventivo) =>
    router.push({
      pathname: '/preventivi/[idPreventivo]',
      params: { idPreventivo: p.id },
    });

  const apriModifica = (p: Preventivo) =>
    router.push({
      pathname: '/preventivi/nuovo',
      params: { idPreventivo: p.id },
    });

  const condividiPdf = async (p: Preventivo) => {
    try {
      await condividiPdfPreventivo(p.id);
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile generare il PDF del preventivo.');
    }
  };

  const totale = preventivi.length;

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <FlatList
        data={filtrati}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[
          styles.lista,
          { paddingTop: insets.top + 24, paddingBottom: 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.intestazione}>
            <Text style={[styles.titolo, { color: t.testo }]}>
              Tutti i Preventivi
            </Text>
            <Text style={[styles.conteggio, { color: t.accento }]}>
              {totale} {totale === 1 ? 'DOCUMENTO' : 'DOCUMENTI'} IN ARCHIVIO
            </Text>

            <View
              style={[
                styles.ricerca,
                { backgroundColor: t.input, borderColor: t.bordo },
              ]}
            >
              <Text style={styles.ricercaIcona}>🔍</Text>
              <TextInput
                value={ricerca}
                onChangeText={setRicerca}
                placeholder="Cerca per N° preventivo o cliente..."
                placeholderTextColor={t.testoSecondario}
                style={[styles.ricercaInput, { color: t.testo }]}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          caricamento ? (
            <ActivityIndicator color={t.accento} style={styles.vuoto} />
          ) : (
            <Text
              style={[
                styles.vuoto,
                styles.vuotoTesto,
                { color: t.testoSecondario },
              ]}
            >
              {ricerca
                ? 'Nessun preventivo corrisponde alla ricerca.'
                : 'Non hai ancora creato preventivi.\nTocca + per crearne uno.'}
            </Text>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separatore} />}
        renderItem={({ item }) => (
          <CardPreventivo
            preventivo={item}
            t={t}
            onApri={() => apriDettaglio(item)}
            onModifica={() => apriModifica(item)}
            onCondividi={() => condividiPdf(item)}
          />
        )}
      />

      {/* Pulsante flottante: nuovo preventivo */}
      <Pressable
        onPress={() => router.push('/preventivi/nuovo')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: t.bottonePrimario, bottom: 24 },
          pressed && styles.premuto,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Nuovo preventivo"
      >
        <Text style={styles.fabTesto}>+</Text>
      </Pressable>
    </View>
  );
}

// --- CARD -------------------------------------------------------------------

function CardPreventivo({
  preventivo: p,
  t,
  onApri,
  onModifica,
  onCondividi,
}: {
  preventivo: Preventivo;
  t: Tema;
  onApri: () => void;
  onModifica: () => void;
  onCondividi: () => void;
}) {
  const stato = STATI[p.stato] ?? STATI.bozza;

  // La card è una View: la parte superiore e i due pulsanti sono Pressable
  // fratelli, non annidati. Sul web ogni Pressable con ruolo "button"
  // diventa un <button>, e un <button> dentro un altro <button> non è valido.
  return (
    <View
      style={[styles.card, { backgroundColor: t.card, borderColor: t.bordo }]}
    >
      <Pressable
        onPress={onApri}
        style={({ pressed }) => [
          styles.cardContenuto,
          pressed && styles.contenutoPremuto,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Apri preventivo ${numeroPreventivo(p)}, ${p.cliente_nome ?? ''}`}
      >
        <View style={styles.cardTesta}>
          <Text style={[styles.numero, { color: t.testo }]}>
            N° {numeroPreventivo(p)}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: stato.sfondo, borderColor: stato.colore },
            ]}
          >
            <Text style={[styles.badgeTesto, { color: stato.colore }]}>
              {stato.etichetta}
            </Text>
          </View>
        </View>

        <Text
          style={[styles.meta, { color: t.testoSecondario }]}
          numberOfLines={1}
        >
          👤 {p.cliente_nome ?? 'Cliente'} • {formattaData(p.data_creazione)}
        </Text>

        {!!p.oggetto && (
          <Text style={[styles.oggetto, { color: t.testo }]} numberOfLines={2}>
            {p.oggetto}
          </Text>
        )}

        <Text style={[styles.importo, { color: t.accento }]}>
          {formattaEuro(p.totale_generale)}
        </Text>
      </Pressable>

      <View style={styles.azioni}>
        <Pressable
          onPress={onCondividi}
          style={({ pressed }) => [
            styles.bottone,
            { backgroundColor: t.bottonePrimario },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.bottoneTesto, { color: '#FFFFFF' }]}>
            📄 Condividi PDF
          </Text>
        </Pressable>
        <Pressable
          onPress={onModifica}
          style={({ pressed }) => [
            styles.bottone,
            { backgroundColor: t.bottoneSecondario },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.bottoneTesto, { color: t.testo }]}>
            ✏️ Modifica
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- STILI ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: {
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  intestazione: { marginBottom: 16 },
  titolo: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  conteggio: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 2,
  },

  ricerca: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 20,
  },
  ricercaIcona: { fontSize: 14, marginRight: 8 },
  ricercaInput: { flex: 1, fontSize: 15, paddingVertical: 12 },

  separatore: { height: 12 },

  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  cardContenuto: { padding: 14, paddingBottom: 0 },
  contenutoPremuto: { opacity: 0.7 },
  cardTesta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  numero: { fontSize: 17, fontWeight: '800' },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTesto: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  meta: { fontSize: 13, marginTop: 2 },
  oggetto: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  importo: { fontSize: 17, fontWeight: '800', marginTop: 8 },

  azioni: { flexDirection: 'row', gap: 8, padding: 14 },
  bottone: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bottoneTesto: { fontSize: 13, fontWeight: '700' },

  vuoto: { marginTop: 48 },
  vuotoTesto: { textAlign: 'center', fontSize: 15, lineHeight: 22 },

  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(217, 119, 6, 0.45)',
  },
  fabTesto: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '600',
    marginTop: -2,
  },

  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
