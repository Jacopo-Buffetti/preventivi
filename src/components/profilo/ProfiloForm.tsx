import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTema } from '../../constants/tema';
import {
  getProfiloFabbro,
  updateProfiloFabbro,
} from '../../services/databaseService';
import type { ImmagineProfilo } from '../../services/immaginiProfilo';
import { avviso } from '../../utils/dialoghi';
import { FormInput } from '../ui/FormInput';
import { FirmaTimbro } from './FirmaTimbro';
import { styles } from './ProfiloForm.styles';

// Dati dell'attività: compaiono sui preventivi (PDF) e servono a
// completare il biglietto da visita.
// Il componente non ha uno scorrimento proprio: sta dentro quello della
// schermata Profilo, insieme alle schede account e aspetto.
export function ProfiloForm() {
  const t = useTema();

  const [nomeAzienda, setNomeAzienda] = useState('');
  const [titolare, setTitolare] = useState('');
  const [pIva, setPIva] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [iban, setIban] = useState('');
  const [firma, setFirma] = useState<string | null>(null);
  const [timbro, setTimbro] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [salvando, setSalvando] = useState(false);
  // Diventa vero alla prima modifica, torna falso dopo il salvataggio
  const [modificato, setModificato] = useState(false);

  useEffect(() => {
    getProfiloFabbro()
      .then((dati) => {
        if (!dati) return;
        setNomeAzienda(dati.nome_azienda || '');
        setTitolare(dati.titolare || '');
        setPIva(dati.p_iva || '');
        setCodiceFiscale(dati.codice_fiscale || '');
        setTelefono(dati.telefono || '');
        setEmail(dati.email || '');
        setIndirizzo(dati.indirizzo || '');
        setIban(dati.iban || '');
        setFirma(dati.firma || null);
        setTimbro(dati.timbro || null);
      })
      .catch((err) => {
        console.error(err);
        avviso('Errore', 'Impossibile caricare i dati del profilo.');
      })
      .finally(() => setCaricamento(false));
  }, []);

  // Ogni campo, quando cambia, segna anche che c'è qualcosa da salvare
  const campo = (imposta: (v: string) => void) => (valore: string) => {
    imposta(valore);
    setModificato(true);
  };

  const cambiaImmagine = (tipo: ImmagineProfilo, valore: string | null) => {
    if (tipo === 'firma') setFirma(valore);
    else setTimbro(valore);
    setModificato(true);
  };

  const salva = async () => {
    if (!nomeAzienda.trim()) {
      avviso(
        'Manca il nome',
        "Scrivi il nome dell'attività: compare in testa ai preventivi."
      );
      return;
    }
    try {
      setSalvando(true);
      await updateProfiloFabbro({
        nome_azienda: nomeAzienda.trim(),
        titolare: titolare.trim(),
        p_iva: pIva.trim(),
        codice_fiscale: codiceFiscale.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        indirizzo: indirizzo.trim(),
        iban: iban.replace(/\s/g, '').toUpperCase(),
        firma,
        timbro,
      });
      setModificato(false);
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile salvare i dati.');
    } finally {
      setSalvando(false);
    }
  };

  if (caricamento) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={t.ottone} size="large" />
      </View>
    );
  }

  return (
    <View>
      <FormInput
        label="Nome dell'attività *"
        placeholder="es. Attività Rossi"
        value={nomeAzienda}
        onChangeText={campo(setNomeAzienda)}
        aiuto="Compare in testa a ogni preventivo."
      />
      <FormInput
        label="Titolare"
        placeholder="es. Mario Rossi"
        value={titolare}
        onChangeText={campo(setTitolare)}
        autoCapitalize="words"
        aiuto="Il nome serve anche per il saluto nella Home."
      />
      <FormInput
        label="Indirizzo dell'attività"
        placeholder="es. Via Roma 1, 00100 Città"
        value={indirizzo}
        onChangeText={campo(setIndirizzo)}
      />
      <FormInput
        label="Telefono"
        placeholder="es. 333 000 0000"
        keyboardType="phone-pad"
        value={telefono}
        onChangeText={campo(setTelefono)}
      />
      <FormInput
        label="Email"
        placeholder="es. info@esempio.it"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={campo(setEmail)}
      />
      <View style={styles.affiancati}>
        <View style={styles.flex}>
          <FormInput
            label="Partita IVA"
            placeholder="00000000000"
            keyboardType="numeric"
            value={pIva}
            onChangeText={campo(setPIva)}
          />
        </View>
        <View style={styles.flex}>
          <FormInput
            label="Codice fiscale"
            placeholder="RSSMRA80A01…"
            autoCapitalize="characters"
            autoCorrect={false}
            value={codiceFiscale}
            onChangeText={campo(setCodiceFiscale)}
          />
        </View>
      </View>
      <FormInput
        label="IBAN"
        placeholder="IT60 X000 0000 0000 0000 0000 000"
        autoCapitalize="characters"
        autoCorrect={false}
        value={iban}
        onChangeText={campo(setIban)}
        aiuto="Per i pagamenti con bonifico. Gli spazi vengono tolti al salvataggio."
      />

      <FirmaTimbro firma={firma} timbro={timbro} onCambia={cambiaImmagine} />

      {/* Ottone con modifiche da salvare, grigio quando è tutto salvato */}
      <Pressable
        onPress={salva}
        disabled={!modificato || salvando}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.salva,
          { backgroundColor: modificato ? t.bottonePrimario : t.riquadro },
          pressed && styles.premuto,
        ]}
      >
        {salvando ? (
          <ActivityIndicator color={t.testoSuPrimario} />
        ) : (
          <>
            <Feather
              name={modificato ? 'save' : 'check'}
              size={18}
              color={modificato ? t.testoSuPrimario : t.testoSecondario}
            />
            <Text
              style={[
                styles.salvaTesto,
                { color: modificato ? t.testoSuPrimario : t.testoSecondario },
              ]}
            >
              {modificato ? 'Salva i dati' : 'Dati salvati'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
