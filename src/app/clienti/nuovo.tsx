import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormInput } from '../../components/ui/FormInput';
import { useTema } from '../../constants/tema';
import {
  addCliente,
  getClienteById,
  updateCliente,
} from '../../services/databaseService';
import { segnaClienteCreato } from '../../utils/clienteAppenaCreato';
import { avviso } from '../../utils/dialoghi';
import { styles } from '../../styles/clienti/nuovo.styles';

// Form del cliente: nuovo o modifica (con idCliente).
// Lo stesso componente è registrato anche come /preventivi/nuovo-cliente,
// quando il cliente si crea mentre si scrive un preventivo.
export default function NuovoClienteScreen() {
  const router = useRouter();
  const percorso = usePathname();
  const { idCliente } = useLocalSearchParams<{ idCliente?: string }>();
  const t = useTema();
  const insets = useSafeAreaInsets();

  const inModifica = !!idCliente;
  // Aperto dal form del preventivo: dopo il salvataggio si torna lì
  const dalPreventivo = percorso.startsWith('/preventivi');

  const [nome, setNome] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [caricamento, setCaricamento] = useState(inModifica);

  useEffect(() => {
    if (!idCliente) return;
    let attivo = true;
    getClienteById(idCliente)
      .then((c) => {
        if (!attivo || !c) return;
        setNome(c.nome || '');
        setIndirizzo(c.indirizzo || '');
        setTelefono(c.telefono || '');
        setEmail(c.email || '');
        setNote(c.note || '');
      })
      .catch((err) => {
        console.error(err);
        avviso('Errore', 'Impossibile caricare i dati del cliente.');
      })
      .finally(() => attivo && setCaricamento(false));
    return () => {
      attivo = false;
    };
  }, [idCliente]);

  const salva = async () => {
    if (!nome.trim()) {
      avviso('Manca il nome', 'Scrivi il nome del cliente per salvarlo.');
      return;
    }
    const dati = {
      nome: nome.trim(),
      indirizzo: indirizzo.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      note: note.trim(),
    };
    try {
      setSalvando(true);
      if (idCliente) {
        // Modifica: si torna alla scheda, che si ricarica da sola
        await updateCliente(idCliente, dati);
        router.back();
      } else if (dalPreventivo) {
        // Nuovo cliente durante un preventivo: si torna al preventivo,
        // che lo troverà già scelto (vedi clienteAppenaCreato.ts)
        const id = await addCliente(dati);
        segnaClienteCreato(id);
        router.back();
      } else {
        // Nuovo cliente dalla rubrica: si apre la sua scheda.
        // replace: con "indietro" dalla scheda si torna alla rubrica, non al form
        const id = await addCliente(dati);
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

  if (caricamento) {
    return (
      <View
        style={[styles.container, styles.centro, { backgroundColor: t.sfondo }]}
      >
        <ActivityIndicator color={t.ottone} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.sfondo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* --- BARRA IN ALTO --- */}
      <View style={[styles.barra, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.annulla}
        >
          <Text style={[styles.annullaTesto, { color: t.testoSecondario }]}>
            Annulla
          </Text>
        </Pressable>
        <Text
          style={[styles.titoloBarra, { color: t.testo }]}
          accessibilityRole="header"
        >
          {inModifica ? 'Modifica cliente' : 'Nuovo cliente'}
        </Text>
        <View style={styles.annulla} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.contenuto, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <FormInput
          label="Nome e cognome, o ragione sociale"
          value={nome}
          onChangeText={setNome}
          placeholder="es. Mario Rossi"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <FormInput
          label="Telefono"
          value={telefono}
          onChangeText={setTelefono}
          placeholder="es. 333 000 0000"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          aiuto="Serve anche per inviare i preventivi su WhatsApp."
        />
        <FormInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="es. mario.rossi@esempio.it"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        <FormInput
          label="Indirizzo"
          value={indirizzo}
          onChangeText={setIndirizzo}
          placeholder="es. Via Roma 1, 00100 Città"
          textContentType="fullStreetAddress"
          aiuto="Compare sul preventivo."
        />
        <FormInput
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="es. Citofono non funzionante, chiamare prima"
          multiline
          style={styles.note}
          textAlignVertical="top"
        />
      </ScrollView>

      {/* --- BARRA IN BASSO --- */}
      <View
        style={[
          styles.barraSalva,
          {
            backgroundColor: t.barraTab,
            borderTopColor: t.bordo,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
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
            <ActivityIndicator color={t.testoSuPrimario} />
          ) : (
            <Text style={[styles.salvaTesto, { color: t.testoSuPrimario }]}>
              {inModifica ? 'Salva modifiche' : 'Salva cliente'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
