import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coloriStato, ETICHETTE_STATO } from '../../constants/stati';
import {
  FONT,
  useSceltaTema,
  useTema,
  type NomeTema,
  type Tema,
} from '../../constants/tema';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import {
  getAllPreventivi,
  type Preventivo,
  type StatoPreventivo,
} from '../../services/databaseService';
import { useTiraPerAggiornare } from '../../services/syncAutomatico';
import { avviso } from '../../utils/dialoghi';
import { formattaEuro, formattaNumeroPreventivo } from '../../utils/formato';

// Filtri in alto: "tutti" più i quattro stati
type Filtro = 'tutti' | StatoPreventivo;

const FILTRI: { valore: Filtro; etichetta: string }[] = [
  { valore: 'tutti', etichetta: 'Tutti' },
  { valore: 'bozza', etichetta: 'Bozze' },
  { valore: 'inviato', etichetta: 'Inviati' },
  { valore: 'accettato', etichetta: 'Accettati' },
  { valore: 'rifiutato', etichetta: 'Rifiutati' },
];

// --- SCHERMATA --------------------------------------------------------------

export default function PreventiviScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTema();
  const { nome: nomeTema } = useSceltaTema();

  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [ricerca, setRicerca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('tutti');

  const { aggiornando, aggiorna } = useTiraPerAggiornare();

  // Ricarica la lista ogni volta che la pagina torna visibile (es. dopo un salvataggio)
  // e quando arrivano dati nuovi dalla sincronizzazione
  useCaricaQuandoVisibile(() => {
    getAllPreventivi()
      .then(setPreventivi)
      .catch((err) => {
        console.error(err);
        avviso('Errore', 'Impossibile caricare i preventivi.');
      })
      .finally(() => setCaricamento(false));
  });

  // Quanti preventivi per ogni filtro (i numeri accanto alle etichette)
  const conteggi = useMemo(() => {
    const c: Record<Filtro, number> = {
      tutti: preventivi.length,
      bozza: 0,
      inviato: 0,
      accettato: 0,
      rifiutato: 0,
    };
    for (const p of preventivi) c[p.stato]++;
    return c;
  }, [preventivi]);

  // Ricerca + filtro, poi raggruppamento per periodo
  const sezioni = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    const filtrati = preventivi.filter((p) => {
      if (filtro !== 'tutti' && p.stato !== filtro) return false;
      if (!q) return true;
      return (
        formattaNumeroPreventivo(p.anno, p.numero_preventivo)
          .toLowerCase()
          .includes(q) ||
        (p.cliente_nome ?? '').toLowerCase().includes(q) ||
        (p.oggetto ?? '').toLowerCase().includes(q)
      );
    });
    return raggruppaPerPeriodo(filtrati);
  }, [preventivi, ricerca, filtro]);

  const apriDettaglio = (p: Preventivo) =>
    router.push({
      pathname: '/preventivi/[idPreventivo]',
      params: { idPreventivo: p.id },
    });

  const totale = preventivi.length;

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <SectionList
        sections={sezioni}
        keyExtractor={(p) => p.id}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={aggiornando}
            onRefresh={aggiorna}
            tintColor={t.ottone}
            colors={[t.ottone]}
          />
        }
        contentContainerStyle={[
          styles.lista,
          { paddingTop: insets.top + 20, paddingBottom: 110 },
        ]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.intestazione}>
            <View style={{ gap: 2 }}>
              <Text
                style={[styles.titolo, { color: t.testo }]}
                accessibilityRole="header"
              >
                Preventivi
              </Text>
              <Text style={[styles.conteggio, { color: t.testoSecondario }]}>
                {totale} {totale === 1 ? 'documento' : 'documenti'} in archivio
              </Text>
            </View>

            <View
              style={[
                styles.ricerca,
                { backgroundColor: t.input, borderColor: t.bordo },
              ]}
            >
              <Feather name="search" size={19} color={t.testoSecondario} />
              <TextInput
                value={ricerca}
                onChangeText={setRicerca}
                placeholder="Cerca per numero, cliente o lavoro"
                placeholderTextColor={t.testoSecondario}
                style={[styles.ricercaInput, { color: t.testo }]}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
                accessibilityLabel="Cerca preventivi"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtri}
              style={styles.filtriContenitore}
            >
              {FILTRI.map((f) => {
                const attivo = filtro === f.valore;
                return (
                  <Pressable
                    key={f.valore}
                    onPress={() => setFiltro(f.valore)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: attivo }}
                    style={[
                      styles.filtro,
                      attivo
                        ? {
                            backgroundColor:
                              nomeTema === 'dark'
                                ? t.bottonePrimario
                                : t.intestazione,
                            borderColor: 'transparent',
                          }
                        : { backgroundColor: t.card, borderColor: t.bordo },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filtroTesto,
                        attivo
                          ? {
                              color:
                                nomeTema === 'dark'
                                  ? t.testoSuPrimario
                                  : '#FFFFFF',
                              fontFamily: FONT.grassetto,
                            }
                          : { color: t.testo },
                      ]}
                    >
                      {f.etichetta} {conteggi[f.valore]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.titoloPeriodo, { color: t.testoSecondario }]}>
            {section.titolo}
          </Text>
        )}
        ListEmptyComponent={
          caricamento ? (
            <ActivityIndicator color={t.ottone} style={styles.vuoto} />
          ) : (
            <Text
              style={[
                styles.vuoto,
                styles.vuotoTesto,
                { color: t.testoSecondario },
              ]}
            >
              {ricerca || filtro !== 'tutti'
                ? 'Nessun preventivo corrisponde alla ricerca.'
                : 'Non hai ancora creato preventivi.\nTocca + per crearne uno.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <RigaPreventivo
            p={item}
            t={t}
            nomeTema={nomeTema}
            onApri={() => apriDettaglio(item)}
          />
        )}
      />

      {/* Pulsante flottante: nuovo preventivo */}
      <Pressable
        onPress={() => router.push('/preventivi/nuovo')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: t.bottonePrimario },
          pressed && styles.premuto,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Nuovo preventivo"
      >
        <Feather name="plus" size={26} color={t.testoSuPrimario} />
      </Pressable>
    </View>
  );
}

// --- RIGA -------------------------------------------------------------------

function RigaPreventivo({
  p,
  t,
  nomeTema,
  onApri,
}: {
  p: Preventivo;
  t: Tema;
  nomeTema: NomeTema;
  onApri: () => void;
}) {
  const bozza = p.numero_preventivo === null;
  const stato = coloriStato(p.stato, nomeTema);
  const rifiutato = p.stato === 'rifiutato';

  return (
    <Pressable
      onPress={onApri}
      accessibilityRole="button"
      accessibilityLabel={`Apri preventivo ${formattaNumeroPreventivo(p.anno, p.numero_preventivo)}, ${p.cliente_nome ?? ''}`}
      style={({ pressed }) => [
        styles.riga,
        {
          backgroundColor: t.card,
          // Le bozze senza numero hanno il bordo tratteggiato: si riconoscono al volo
          borderColor: bozza ? t.testoSecondario : t.bordo,
          borderStyle: bozza ? 'dashed' : 'solid',
          borderWidth: bozza ? 1.5 : 1,
        },
        pressed && styles.premuto,
      ]}
    >
      <View style={styles.rigaTesti}>
        <Text style={[styles.rigaNumero, { color: t.testoSecondario }]}>
          {bozza
            ? 'Bozza, senza numero'
            : `N. ${formattaNumeroPreventivo(p.anno, p.numero_preventivo)}`}
        </Text>
        <Text
          style={[styles.rigaOggetto, { color: t.testo }]}
          numberOfLines={1}
        >
          {p.oggetto?.trim() || 'Senza oggetto'}
        </Text>
        <Text
          style={[styles.rigaCliente, { color: t.testoSecondario }]}
          numberOfLines={1}
        >
          {p.cliente_nome ?? 'Cliente'}
        </Text>
      </View>
      <View style={styles.rigaDestra}>
        <Text
          style={[
            styles.rigaImporto,
            { color: rifiutato ? t.testoSecondario : t.testo },
            rifiutato && styles.barrato,
          ]}
        >
          {formattaEuro(p.totale_generale)}
        </Text>
        {!bozza && (
          <View style={[styles.badge, { backgroundColor: stato.sfondo }]}>
            <Text style={[styles.badgeTesto, { color: stato.colore }]}>
              {ETICHETTE_STATO[p.stato]}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// --- RAGGRUPPAMENTO PER PERIODO ----------------------------------------------

// La lista arriva già ordinata dal più recente: basta scorrerla e aprire
// un gruppo nuovo ogni volta che cambia il periodo
function raggruppaPerPeriodo(lista: Preventivo[]) {
  const gruppi: { titolo: string; data: Preventivo[] }[] = [];
  for (const p of lista) {
    const titolo = periodo(p.data_creazione);
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.titolo === titolo) ultimo.data.push(p);
    else gruppi.push({ titolo, data: [p] });
  }
  return gruppi;
}

function periodo(data: string): string {
  const d = new Date(data);
  const oggi = new Date();
  const giorni = Math.floor(
    (Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()) -
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      86_400_000
  );
  if (giorni < 7) return 'Ultimi 7 giorni';
  if (
    d.getFullYear() === oggi.getFullYear() &&
    d.getMonth() === oggi.getMonth()
  ) {
    return 'Prima, in questo mese';
  }
  const testo = d.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  });
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

// --- STILI ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: {
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  intestazione: { gap: 14, marginBottom: 4 },
  titolo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  conteggio: { fontSize: 13, fontFamily: FONT.regolare },

  ricerca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  ricercaInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT.regolare,
    paddingVertical: 0,
  },

  filtriContenitore: { marginHorizontal: -20 },
  filtri: { gap: 8, paddingHorizontal: 20 },
  filtro: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  filtroTesto: { fontSize: 13, fontFamily: FONT.semi },

  titoloPeriodo: {
    fontSize: 13,
    fontFamily: FONT.grassetto,
    paddingTop: 18,
    paddingBottom: 8,
  },

  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  rigaTesti: { flex: 1, minWidth: 0, gap: 3 },
  rigaNumero: {
    fontSize: 12,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  rigaOggetto: { fontSize: 16, fontFamily: FONT.grassetto },
  rigaCliente: { fontSize: 13, fontFamily: FONT.regolare },
  rigaDestra: { alignItems: 'flex-end', gap: 6 },
  rigaImporto: {
    fontSize: 16,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  barrato: { textDecorationLine: 'line-through' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTesto: { fontSize: 11, fontFamily: FONT.grassetto },

  vuoto: { marginTop: 48 },
  vuotoTesto: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONT.regolare,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 20px rgba(7, 21, 34, 0.3)',
  },

  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
