import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../../constants/tema';
import { getClienti, type Cliente } from '../../services/databaseService';

interface Props {
  visibile: boolean;
  onChiudi: () => void;
  onScegli: (cliente: Cliente) => void;
}

export function descriviCliente(c: Cliente): string {
  return c.indirizzo ? `${c.nome} (${c.indirizzo})` : c.nome;
}

// Foglio con la rubrica per scegliere il cliente del preventivo
export function SelettoreCliente({ visibile, onChiudi, onScegli }: Props) {
  const t = useTema();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [ricerca, setRicerca] = useState('');

  useEffect(() => {
    if (!visibile) return;
    setRicerca('');
    getClienti().then(setClienti).catch(console.error);
  }, [visibile]);

  const q = ricerca.trim().toLowerCase();
  const filtrati = q
    ? clienti.filter((c) => c.nome.toLowerCase().includes(q))
    : clienti;

  const nuovoCliente = () => {
    onChiudi();
    router.push('/clienti/nuovo');
  };

  return (
    <Modal
      visible={visibile}
      transparent
      animationType="slide"
      onRequestClose={onChiudi}
    >
      <View style={styles.contenitore}>
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
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.maniglia, { backgroundColor: t.bordo }]} />
          <View style={styles.testa}>
            <Text style={[styles.titolo, { color: t.accento }]}>
              Scegli il cliente
            </Text>
            <Pressable
              onPress={onChiudi}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Chiudi"
            >
              <Text style={[styles.chiudi, { color: t.testoSecondario }]}>
                ✕
              </Text>
            </Pressable>
          </View>

          <TextInput
            value={ricerca}
            onChangeText={setRicerca}
            placeholder="Cerca per nome..."
            placeholderTextColor={t.testoSecondario}
            style={[
              styles.input,
              {
                backgroundColor: t.inputFoglio,
                borderColor: t.bordo,
                color: t.testo,
              },
            ]}
            autoCorrect={false}
          />

          <FlatList
            data={filtrati}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            style={styles.lista}
            ListEmptyComponent={
              <Text style={[styles.vuoto, { color: t.testoSecondario }]}>
                {clienti.length === 0
                  ? 'La rubrica è vuota.'
                  : 'Nessun cliente corrisponde alla ricerca.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onScegli(item)}
                style={({ pressed }) => [
                  styles.riga,
                  { borderColor: t.bordo },
                  pressed && { backgroundColor: t.inputFoglio },
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.nome, { color: t.testo }]}>
                  {item.nome}
                </Text>
                {!!item.indirizzo && (
                  <Text
                    style={[styles.dettaglio, { color: t.testoSecondario }]}
                  >
                    {item.indirizzo}
                  </Text>
                )}
              </Pressable>
            )}
          />

          <Pressable
            onPress={nuovoCliente}
            style={({ pressed }) => [
              styles.bottone,
              { borderColor: t.accento },
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.bottoneTesto, { color: t.accento }]}>
              ＋ Nuovo cliente
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    maxHeight: '80%',
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
    marginBottom: 12,
  },
  titolo: { fontSize: 18, fontWeight: '800' },
  chiudi: { fontSize: 18, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  lista: { marginTop: 8 },
  riga: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1 },
  nome: { fontSize: 15, fontWeight: '700' },
  dettaglio: { fontSize: 13, marginTop: 2 },
  vuoto: { textAlign: 'center', marginVertical: 24, fontSize: 14 },
  bottone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  bottoneTesto: { fontSize: 14, fontWeight: '700' },
});
