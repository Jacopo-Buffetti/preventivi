import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getProfiloFabbro,
  updateProfiloFabbro,
} from '../../services/databaseService';
import { FormInput } from '../ui/FormInput';
import { PrimaryButton } from '../ui/PrimaryButton';

export function ProfiloForm() {
  const router = useRouter();

  const [nomeAzienda, setNomeAzienda] = useState('');
  const [titolare, setTitolare] = useState('');
  const [pIva, setPIva] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [iban, setIban] = useState('');
  const [caricamento, setCaricamento] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    caricaProfilo();
  }, []);

  const caricaProfilo = async () => {
    try {
      const dati = await getProfiloFabbro();
      if (dati) {
        setNomeAzienda(dati.nome_azienda || '');
        setTitolare(dati.titolare || '');
        setPIva(dati.p_iva || '');
        setCodiceFiscale(dati.codice_fiscale || '');
        setTelefono(dati.telefono || '');
        setEmail(dati.email || '');
        setIndirizzo(dati.indirizzo || '');
        setIban(dati.iban || '');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Errore', 'Impossibile caricare i dati del profilo.');
    } finally {
      setCaricamento(false);
    }
  };

  const handleSalva = async () => {
    if (!nomeAzienda.trim()) {
      Alert.alert(
        'Attenzione',
        "Inserisci il nome dell'azienda o della ditta."
      );
      return;
    }

    try {
      setSalvando(true);
      await updateProfiloFabbro({
        nome_azienda: nomeAzienda,
        titolare,
        p_iva: pIva,
        codice_fiscale: codiceFiscale,
        telefono,
        email,
        indirizzo,
        iban,
      });

      Alert.alert('Successo', 'Dati del profilo salvati correttamente!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Errore', 'Impossibile salvare i dati.');
    } finally {
      setSalvando(false);
    }
  };

  if (caricamento) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Caricamento dati...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FormInput
        label="Nome Azienda / Ditta *"
        placeholder="es. Officina Carpenteria Rossi"
        value={nomeAzienda}
        onChangeText={setNomeAzienda}
      />

      <FormInput
        label="Titolare"
        placeholder="es. Mario Rossi"
        value={titolare}
        onChangeText={setTitolare}
      />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <FormInput
            label="P.IVA"
            placeholder="12345678901"
            keyboardType="numeric"
            value={pIva}
            onChangeText={setPIva}
          />
        </View>

        <View style={styles.flex1}>
          <FormInput
            label="Codice Fiscale"
            placeholder="RSSMRA..."
            autoCapitalize="characters"
            value={codiceFiscale}
            onChangeText={setCodiceFiscale}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.flex1}>
          <FormInput
            label="Telefono"
            placeholder="3331234567"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />
        </View>

        <View style={styles.flex1}>
          <FormInput
            label="Email"
            placeholder="info@officina.it"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

      <FormInput
        label="Indirizzo Officina"
        placeholder="Via della Meccanica 10, Perugia"
        value={indirizzo}
        onChangeText={setIndirizzo}
      />

      <FormInput
        label="Coordinate Bancarie (IBAN)"
        placeholder="IT60X0000000000000000000000"
        autoCapitalize="characters"
        value={iban}
        onChangeText={setIban}
      />

      <PrimaryButton
        title="Salva Profilo"
        loading={salvando}
        onPress={handleSalva}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: { color: '#64748b', fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  saveBtn: { marginBottom: 20 },
});
