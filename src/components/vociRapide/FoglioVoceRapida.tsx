import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTema } from '../../constants/tema';
import { trovaUnita } from '../../constants/unita';
import {
  aggiornaVoceRapida,
  creaVoceRapida,
  type VoceRapida,
} from '../../services/vociRapideService';
import { avviso } from '../../utils/dialoghi';
import { leggiNumero } from '../../utils/formato';
import { SceltaUnita } from '../preventivi/SceltaUnita';
import { FoglioInBasso } from '../ui/FoglioInBasso';
import { styles } from './FoglioVoceRapida.styles';

interface Props {
  visibile: boolean;
  // La voce da modificare; null = nuova voce
  voce: VoceRapida | null;
  onChiudi: () => void;
  onSalvata: () => void;
  onElimina: (voce: VoceRapida) => void;
}

// Foglio dal basso per creare o modificare una voce rapida.
// Stessi campi del foglio delle voci del preventivo, più la quantità
// proposta: quella che si trova già scritta quando si sceglie la voce.
export function FoglioVoceRapida({
  visibile,
  voce,
  onChiudi,
  onSalvata,
  onElimina,
}: Props) {
  const t = useTema();
  const [descrizione, setDescrizione] = useState('');
  const [prezzo, setPrezzo] = useState('');
  const [quantita, setQuantita] = useState('1');
  const [unita, setUnita] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const inModifica = voce !== null;

  useEffect(() => {
    if (!visibile) return;
    setDescrizione(voce?.descrizione ?? '');
    setPrezzo(voce ? numeroInTesto(voce.prezzo) : '');
    setQuantita(voce ? numeroInTesto(voce.quantita) : '1');
    setUnita(trovaUnita(voce?.unita)?.id ?? null);
  }, [visibile, voce]);

  const p = leggiNumero(prezzo);
  const q = leggiNumero(quantita);
  const valida =
    descrizione.trim() !== '' && p !== null && p >= 0 && q !== null && q > 0;

  const salva = async () => {
    if (!valida || salvando) return;
    const dati = { descrizione, prezzo: p!, quantita: q!, unita };
    try {
      setSalvando(true);
      if (voce) await aggiornaVoceRapida(voce.id, dati);
      else await creaVoceRapida(dati);
      onSalvata();
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile salvare la voce rapida.');
    } finally {
      setSalvando(false);
    }
  };

  const stileInput = [
    styles.input,
    { backgroundColor: t.inputFoglio, borderColor: t.bordo, color: t.testo },
  ];

  return (
    <FoglioInBasso
      visibile={visibile}
      titolo={inModifica ? 'Modifica voce rapida' : 'Nuova voce rapida'}
      onChiudi={onChiudi}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          Descrizione
        </Text>
        <TextInput
          value={descrizione}
          onChangeText={setDescrizione}
          placeholder="es. Manodopera"
          placeholderTextColor={t.testoSecondario}
          style={stileInput}
          autoFocus={!inModifica}
          returnKeyType="next"
          accessibilityLabel="Descrizione"
        />

        <View style={styles.affiancati}>
          <View style={styles.colonna}>
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              Prezzo (€)
            </Text>
            <TextInput
              value={prezzo}
              onChangeText={setPrezzo}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={t.testoSecondario}
              style={[...stileInput, styles.cifre]}
              accessibilityLabel="Prezzo in euro"
            />
          </View>
          <View style={styles.colonna}>
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              Quantità proposta
            </Text>
            <TextInput
              value={quantita}
              onChangeText={setQuantita}
              keyboardType="decimal-pad"
              style={[...stileInput, styles.cifre]}
              selectTextOnFocus
              accessibilityLabel="Quantità proposta"
            />
          </View>
        </View>

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          Unità (facoltativa)
        </Text>
        <SceltaUnita valore={unita} onCambia={setUnita} />

        <Pressable
          onPress={salva}
          disabled={!valida || salvando}
          style={({ pressed }) => [
            styles.bottone,
            { backgroundColor: t.bottonePrimario },
            (!valida || salvando) && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !valida || salvando }}
        >
          <Text style={[styles.bottoneTesto, { color: t.testoSuPrimario }]}>
            {inModifica ? 'Salva le modifiche' : 'Aggiungi la voce'}
          </Text>
        </Pressable>

        {voce && (
          <Pressable
            onPress={() => onElimina(voce)}
            disabled={salvando}
            style={({ pressed }) => [
              styles.elimina,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
          >
            <Feather name="trash-2" size={16} color={t.pericolo} />
            <Text style={[styles.eliminaTesto, { color: t.pericolo }]}>
              Elimina voce
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </FoglioInBasso>
  );
}

// 35 → "35", 18.5 → "18,5": come lo scriverebbe l'utente
function numeroInTesto(valore: number): string {
  return String(valore).replace('.', ',');
}
