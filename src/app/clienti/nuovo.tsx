import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../../constants/tema';
import {
  addCliente,
  getClienteById,
  updateCliente,
} from '../../services/databaseService';
import { avviso } from '../../utils/dialoghi';

export default function NuovoClienteScreen() {
  const router = useRouter();
  const { idCliente } = useLocalSearchParams<{ idCliente?: string }>();
  const t = useTema();
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salva = async () => {
    if (!nome.trim()) {
      avviso('Attenzione', 'Inserisci il nome del cliente.');
      return;
    }
    try {
      setSalvando(true);
      if (idCliente) {
        await updateCliente(idCliente, {
          nome: nome.trim(),
          indirizzo: indirizzo.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          note: note.trim(),
        });
        router.replace({
          pathname: '/clienti/[idCliente]',
          params: { idCliente },
        });
      } else {
        const id = await addCliente({
          nome: nome.trim(),
          indirizzo: indirizzo.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          note: note.trim(),
        });
        router.replace({
          pathname: '/clienti/[idCliente]',
          params: { idCliente: id },
        });
      }
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile salvare il cliente.');
    } finally {
      setSalvando(false);
    }
  };

  useEffect(() => {
    if (!idCliente) return;
    let mounted = true;
    (async () => {
      try {
        const c = await getClienteById(idCliente);
        if (!mounted || !c) return;
        setNome(c.nome || '');
        setIndirizzo(c.indirizzo || '');
        setTelefono(c.telefono || '');
        setEmail(c.email || '');
        setNote(c.note || '');
      } catch (err) {
        console.error(err);
        avviso('Errore', 'Impossibile caricare i dati del cliente.');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [idCliente]);

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <View style={[styles.barra, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={[styles.annulla, { color: t.testoSecondario }]}>
            Annulla
          </Text>
        </Pressable>
        <Text style={[styles.titoloBarra, { color: t.testo }]}>
          Nuovo Cliente
        </Text>
        <View style={styles.segnapostoBarra} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          NOME
        </Text>
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Es. Rossi Mario"
          placeholderTextColor={t.testoSecondario}
          style={[
            styles.input,
            { backgroundColor: t.input, borderColor: t.bordo, color: t.testo },
          ]}
        />

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          INDIRIZZO
        </Text>
        <TextInput
          value={indirizzo}
          onChangeText={setIndirizzo}
          placeholder="Via..., Città"
          placeholderTextColor={t.testoSecondario}
          style={[
            styles.input,
            { backgroundColor: t.input, borderColor: t.bordo, color: t.testo },
          ]}
        />

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          TELEFONO
        </Text>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          placeholder="333 0000000"
          placeholderTextColor={t.testoSecondario}
          style={[
            styles.input,
            { backgroundColor: t.input, borderColor: t.bordo, color: t.testo },
          ]}
        />

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          EMAIL
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="mail@example.com"
          placeholderTextColor={t.testoSecondario}
          style={[
            styles.input,
            { backgroundColor: t.input, borderColor: t.bordo, color: t.testo },
          ]}
        />

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          NOTE
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note"
          placeholderTextColor={t.testoSecondario}
          style={[
            styles.inputMultiline,
            { backgroundColor: t.input, borderColor: t.bordo, color: t.testo },
          ]}
          multiline
        />

        <Pressable
          onPress={salva}
          disabled={salvando}
          style={({ pressed }) => [
            styles.salva,
            { backgroundColor: t.bottonePrimario },
            salvando && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          {salvando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.salvaTesto}>💾 Salva cliente</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  annulla: { fontSize: 15, width: 70 },
  titoloBarra: { fontSize: 17, fontWeight: '800' },
  segnapostoBarra: { width: 70 },
  contenuto: {
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  etichetta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  salva: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  salvaTesto: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabilitato: { opacity: 0.6 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
