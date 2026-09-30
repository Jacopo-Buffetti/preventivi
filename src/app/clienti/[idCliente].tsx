import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../../constants/tema';
import {
  deleteCliente,
  getClienteById,
  getPreventiviByClienteId,
  type Cliente,
} from '../../services/databaseService';
import { avviso, conferma } from '../../utils/dialoghi';
import { formattaData, formattaNumeroPreventivo } from '../../utils/formato';

export default function DettaglioClienteScreen() {
  const { idCliente } = useLocalSearchParams<{ idCliente: string }>();
  const router = useRouter();
  const t = useTema();
  const insets = useSafeAreaInsets();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [preventivi, setPreventivi] = useState<any[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!idCliente) return;
      Promise.all([
        getClienteById(idCliente),
        getPreventiviByClienteId(idCliente),
      ])
        .then(([c, p]) => {
          setCliente(c);
          setPreventivi(p);
        })
        .catch((err) => {
          console.error(err);
          avviso('Errore', 'Impossibile caricare i dati del cliente.');
        })
        .finally(() => setCaricamento(false));
    }, [idCliente])
  );

  if (caricamento) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <ActivityIndicator color={t.accento} size="large" />
      </View>
    );
  }

  if (!cliente) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <Text style={[styles.titoloVuoto, { color: t.testo }]}>
          Cliente non trovato
        </Text>
        <Pressable
          onPress={() => router.replace('/clienti')}
          style={[styles.bottone, { borderColor: t.bordo, marginTop: 20 }]}
          accessibilityRole="button"
        >
          <Text style={{ color: t.testo }}>Torna alla rubrica</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Text style={[styles.nome, { color: t.testo }]}>👤 {cliente.nome}</Text>
        {!!cliente.indirizzo && (
          <Text style={[styles.dettaglio, { color: t.testoSecondario }]}>
            📍 {cliente.indirizzo}
          </Text>
        )}
        {!!cliente.telefono && (
          <Text style={[styles.dettaglio, { color: t.testoSecondario }]}>
            📞 {cliente.telefono}
          </Text>
        )}
        {!!cliente.email && (
          <Text style={[styles.dettaglio, { color: t.testoSecondario }]}>
            ✉️ {cliente.email}
          </Text>
        )}

        <Text style={[styles.sezioneTitolo, { color: t.testo }]}>
          Preventivi del cliente
        </Text>
        {preventivi.length === 0 ? (
          <Text style={[styles.vuoto, { color: t.testoSecondario }]}>
            Nessun preventivo per questo cliente.
          </Text>
        ) : (
          preventivi.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({
                  pathname: '/preventivi/[idPreventivo]',
                  params: { idPreventivo: p.id },
                })
              }
              style={({ pressed }) => [
                styles.previo,
                { backgroundColor: t.card, borderColor: t.bordo },
                pressed && styles.premuto,
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.previoTitolo, { color: t.testo }]}>
                N° {formattaNumeroPreventivo(p.anno, p.numero_preventivo)}
              </Text>
              <Text style={[styles.previoMeta, { color: t.testoSecondario }]}>
                {formattaData(p.data_creazione)}
              </Text>
            </Pressable>
          ))
        )}

        <Pressable
          onPress={() => router.push('/preventivi/nuovo')}
          style={({ pressed }) => [
            styles.bottoneAzione,
            { backgroundColor: t.bottonePrimario },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
            ＋ Nuovo preventivo
          </Text>
        </Pressable>
        <View style={{ height: 12 }} />
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/clienti/nuovo',
              params: { idCliente: cliente.id },
            })
          }
          style={({ pressed }) => [
            styles.bottoneModifica,
            { borderColor: t.bordo },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={{ color: t.testo }}>✏️ Modifica contatto</Text>
        </Pressable>
        <View style={{ height: 8 }} />
        <Pressable
          onPress={async () => {
            const ok = await conferma(
              'Eliminare il contatto?',
              'Il cliente verrà eliminato definitivamente.',
              'Elimina',
              true
            );
            if (!ok) return;
            try {
              await deleteCliente(cliente.id);
              router.replace('/clienti');
            } catch (err) {
              console.error(err);
              avviso('Errore', 'Impossibile eliminare il cliente.');
            }
          }}
          style={({ pressed }) => [
            styles.bottone,
            { borderColor: t.pericolo, marginTop: 8 },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={{ color: t.pericolo }}>🗑️ Elimina contatto</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titoloVuoto: { fontSize: 18, fontWeight: '800' },
  contenuto: {
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  nome: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  dettaglio: { fontSize: 14, marginTop: 8 },
  sezioneTitolo: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  vuoto: { fontSize: 14 },
  previo: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  previoTitolo: { fontSize: 15, fontWeight: '800' },
  previoMeta: { fontSize: 13, marginTop: 4 },
  bottoneAzione: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  bottone: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
