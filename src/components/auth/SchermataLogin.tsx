import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, useTema } from '../../constants/tema';
import { supabase } from '../../services/supabase';
import { FormInput } from '../ui/FormInput';
import { PrimaryButton } from '../ui/PrimaryButton';

// Mostrata da _layout.tsx quando non c'è una sessione salvata.
// Non naviga da nessuna parte: quando il login riesce, Supabase avvisa
// _layout.tsx (onAuthStateChange), che al posto di questa mostra l'app.
export function SchermataLogin() {
  const t = useTema();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const accedi = async () => {
    const emailPulita = email.trim().toLowerCase();
    if (!emailPulita || !password) {
      setErrore('Inserisci email e password.');
      return;
    }

    setInCorso(true);
    setErrore(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailPulita,
        password,
      });
      if (error) setErrore(messaggioErrore(error.message));
      // Se va a buon fine non serve fare altro: ci pensa _layout.tsx
    } catch (err) {
      console.error(err);
      setErrore('Impossibile contattare il server. Controlla la connessione.');
    } finally {
      setInCorso(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: t.sfondo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('../../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={[styles.titolo, { color: t.testo }]}>Accedi</Text>
        <Text style={[styles.sottotitolo, { color: t.testoSecondario }]}>
          Serve solo la prima volta su questo dispositivo: poi l'accesso resta
          salvato e l'app funziona anche senza connessione.
        </Text>

        <FormInput
          label="Email"
          value={email}
          onChangeText={(testo) => {
            setEmail(testo);
            setErrore(null);
          }}
          placeholder="nome@esempio.it"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <FormInput
          label="Password"
          value={password}
          onChangeText={(testo) => {
            setPassword(testo);
            setErrore(null);
          }}
          placeholder="La tua password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={accedi}
        />

        {errore && (
          <View style={[styles.boxErrore, { borderColor: t.pericolo }]}>
            <Text style={[styles.testoErrore, { color: t.pericolo }]}>
              {errore}
            </Text>
          </View>
        )}

        <PrimaryButton title="Accedi" onPress={accedi} loading={inCorso} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Traduce i messaggi più comuni di Supabase Auth (che arrivano in inglese)
function messaggioErrore(messaggio: string): string {
  const m = messaggio.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'Email o password non corrette.';
  }
  if (m.includes('email not confirmed')) {
    return "L'utente non è ancora confermato.";
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Impossibile contattare il server. Controlla la connessione.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Troppi tentativi. Riprova tra qualche minuto.';
  }
  return messaggio;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contenuto: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  // Il logo è disegnato in blu notte: sul tema scuro sparirebbe, quindi
  // sta sempre su un riquadro bianco, come nella Home
  logo: {
    width: 140,
    height: 140,
    alignSelf: 'center',
    marginBottom: 28,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
  },
  titolo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  sottotitolo: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 24,
    fontFamily: FONT.regolare,
  },
  boxErrore: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  testoErrore: { fontSize: 14, fontFamily: FONT.semi },
});
