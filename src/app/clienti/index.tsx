import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, useTema, type Tema } from '../../constants/tema';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import { getClienti, type Cliente } from '../../services/databaseService';
import { useTiraPerAggiornare } from '../../services/syncAutomatico';
import { avviso } from '../../utils/dialoghi';
import { iniziali } from '../../utils/formato';

export default function ClientiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTema();

  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [ricerca, setRicerca] = useState('');

  const { aggiornando, aggiorna } = useTiraPerAggiornare();

  useCaricaQuandoVisibile(() => {
    getClienti()
      .then(setClienti)
      .catch((err) => {
        console.error(err);
        avviso('Errore', 'Impossibile caricare la rubrica clienti.');
      })
      .finally(() => setCaricamento(false));
  });

  // Ricerca su nome, telefono e indirizzo, poi gruppi per iniziale (A, B, C…)
  const sezioni = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    const filtrati = q
      ? clienti.filter(
          (c) =>
            (c.nome ?? '').toLowerCase().includes(q) ||
            (c.telefono ?? '')
              .replace(/\s/g, '')
              .includes(q.replace(/\s/g, '')) ||
            (c.indirizzo ?? '').toLowerCase().includes(q)
        )
      : clienti;
    return raggruppaPerIniziale(filtrati);
  }, [clienti, ricerca]);

  const totale = clienti.length;

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <SectionList
        sections={sezioni}
        keyExtractor={(c) => c.id}
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
                Clienti
              </Text>
              <Text style={[styles.conteggio, { color: t.testoSecondario }]}>
                {totale} {totale === 1 ? 'contatto' : 'contatti'} in rubrica
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
                placeholder="Cerca per nome, telefono o indirizzo"
                placeholderTextColor={t.testoSecondario}
                style={[styles.ricercaInput, { color: t.testo }]}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
                accessibilityLabel="Cerca clienti"
              />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.lettera, { color: t.accento }]}>
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
              {ricerca
                ? 'Nessun cliente corrisponde alla ricerca.'
                : 'La rubrica è vuota.\nTocca + per aggiungere il primo cliente.'}
            </Text>
          )
        }
        renderItem={({ item, index, section }) => (
          <RigaCliente
            c={item}
            t={t}
            prima={index === 0}
            ultima={index === section.data.length - 1}
            onApri={() =>
              router.push({
                pathname: '/clienti/[idCliente]',
                params: { idCliente: item.id },
              })
            }
          />
        )}
      />

      <Pressable
        onPress={() => router.push('/clienti/nuovo')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: t.bottonePrimario },
          pressed && styles.premuto,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Nuovo cliente"
      >
        <Feather name="user-plus" size={24} color={t.testoSuPrimario} />
      </Pressable>
    </View>
  );
}

// Le righe di una stessa lettera formano un'unica scheda: la prima ha gli
// angoli arrotondati in alto, l'ultima in basso, in mezzo una linea sottile
function RigaCliente({
  c,
  t,
  prima,
  ultima,
  onApri,
}: {
  c: Cliente;
  t: Tema;
  prima: boolean;
  ultima: boolean;
  onApri: () => void;
}) {
  return (
    <Pressable
      onPress={onApri}
      accessibilityRole="button"
      accessibilityLabel={`Apri ${c.nome}`}
      style={({ pressed }) => [
        styles.riga,
        {
          backgroundColor: pressed ? t.riquadro : t.card,
          borderColor: t.bordo,
        },
        prima && styles.rigaPrima,
        ultima && styles.rigaUltima,
      ]}
    >
      {!prima && (
        <View style={[styles.divisore, { backgroundColor: t.bordo }]} />
      )}
      <View style={[styles.avatar, { backgroundColor: t.riquadro }]}>
        <Text style={[styles.avatarTesto, { color: t.testo }]}>
          {iniziali(c.nome)}
        </Text>
      </View>
      <View style={styles.testi}>
        <Text style={[styles.nome, { color: t.testo }]} numberOfLines={1}>
          {c.nome}
        </Text>
        {!!(c.indirizzo || c.telefono) && (
          <Text
            style={[styles.dettaglio, { color: t.testoSecondario }]}
            numberOfLines={1}
          >
            {c.indirizzo || c.telefono}
          </Text>
        )}
      </View>
      <Feather name="chevron-right" size={20} color={t.testoSecondario} />
    </Pressable>
  );
}

// I clienti arrivano già in ordine alfabetico dal database
function raggruppaPerIniziale(lista: Cliente[]) {
  const gruppi: { titolo: string; data: Cliente[] }[] = [];
  for (const c of lista) {
    const prima = (c.nome ?? '').trim().charAt(0).toUpperCase();
    // Numeri e simboli finiscono tutti sotto "#"
    const titolo = /[A-ZÀ-Ý]/.test(prima) ? prima : '#';
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.titolo === titolo) ultimo.data.push(c);
    else gruppi.push({ titolo, data: [c] });
  }
  return gruppi;
}

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

  lettera: {
    fontSize: 14,
    fontFamily: FONT.pieno,
    paddingTop: 18,
    paddingBottom: 8,
    paddingLeft: 4,
  },

  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  rigaPrima: {
    borderTopWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  rigaUltima: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  divisore: { position: 'absolute', top: 0, left: 66, right: 0, height: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: { fontSize: 14, fontFamily: FONT.pieno },
  testi: { flex: 1, minWidth: 0, gap: 2 },
  nome: { fontSize: 16, fontFamily: FONT.grassetto },
  dettaglio: { fontSize: 13, fontFamily: FONT.regolare },

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
