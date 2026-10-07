import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import { useTema } from '../../constants/tema';
import { getClienti, type Cliente } from '../../services/databaseService';
import { useTiraPerAggiornare } from '../../services/syncAutomatico';
import { avviso } from '../../utils/dialoghi';

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

  const filtrati = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return clienti;
    return clienti.filter((c) => (c.nome ?? '').toLowerCase().includes(q));
  }, [clienti, ricerca]);

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <FlatList
        data={filtrati}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl refreshing={aggiornando} onRefresh={aggiorna} tintColor={t.accento} />
        }
        contentContainerStyle={[
          styles.lista,
          { paddingTop: insets.top + 24, paddingBottom: 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.intestazione}>
            <Text style={[styles.titolo, { color: t.testo }]}>
              Rubrica Clienti
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
                placeholder="Cerca per nome..."
                placeholderTextColor={t.testoSecondario}
                style={[styles.ricercaInput, { color: t.testo }]}
                returnKeyType="search"
                autoCorrect={false}
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
              Nessun cliente trovato.
            </Text>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separatore} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/clienti/[idCliente]',
                params: { idCliente: item.id },
              })
            }
            style={({ pressed }) => [
              styles.riga,
              { backgroundColor: t.card, borderColor: t.bordo },
              pressed && styles.premuto,
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.nome, { color: t.testo }]}>{item.nome}</Text>
            {!!item.indirizzo && (
              <Text style={[styles.dettaglio, { color: t.testoSecondario }]}>
                {item.indirizzo}
              </Text>
            )}
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push('/clienti/nuovo')}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: t.bottonePrimario, bottom: 24 },
          pressed && styles.premuto,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Nuovo cliente"
      >
        <Text style={styles.fabTesto}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: {
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  intestazione: { marginBottom: 12 },
  titolo: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  ricerca: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  ricercaIcona: { fontSize: 14, marginRight: 8 },
  ricercaInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  separatore: { height: 12 },
  riga: { borderWidth: 1, borderRadius: 12, padding: 12 },
  nome: { fontSize: 15, fontWeight: '800' },
  dettaglio: { fontSize: 13, marginTop: 6 },
  vuoto: { marginTop: 48 },
  vuotoTesto: { textAlign: 'center', fontSize: 15 },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabTesto: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '600',
    marginTop: -2,
  },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
