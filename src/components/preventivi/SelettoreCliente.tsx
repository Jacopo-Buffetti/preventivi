import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useTema } from '../../constants/tema';
import { getClienti, type Cliente } from '../../services/databaseService';
import { FoglioInBasso } from '../ui/FoglioInBasso';
import { styles } from './SelettoreCliente.styles';

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
    // Il form si apre dentro la sezione Preventivi: dopo il salvataggio si
    // torna al preventivo, con il nuovo cliente già scelto
    router.push('/preventivi/nuovo-cliente');
  };

  return (
    <FoglioInBasso
      visibile={visibile}
      titolo="Scegli il cliente"
      onChiudi={onChiudi}
      altezzaMassima="80%"
    >
      <View
        style={[
          styles.ricerca,
          { backgroundColor: t.inputFoglio, borderColor: t.bordo },
        ]}
      >
        <Feather name="search" size={19} color={t.testoSecondario} />
        <TextInput
          value={ricerca}
          onChangeText={setRicerca}
          placeholder="Cerca per nome"
          placeholderTextColor={t.testoSecondario}
          style={[styles.ricercaInput, { color: t.testo }]}
          autoCorrect={false}
          accessibilityLabel="Cerca cliente"
        />
      </View>

      <FlatList
        data={filtrati}
        keyExtractor={(c) => c.id}
        keyboardShouldPersistTaps="handled"
        style={styles.lista}
        ListEmptyComponent={
          <Text style={[styles.vuoto, { color: t.testoSecondario }]}>
            {clienti.length === 0
              ? 'La rubrica è vuota: aggiungi il primo cliente qui sotto.'
              : 'Nessun cliente corrisponde alla ricerca.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onScegli(item)}
            style={({ pressed }) => [
              styles.riga,
              { borderBottomColor: t.bordo },
              pressed && { backgroundColor: t.riquadro },
            ]}
            accessibilityRole="button"
          >
            <View style={[styles.iniziale, { backgroundColor: t.riquadro }]}>
              <Text style={[styles.inizialeTesto, { color: t.testo }]}>
                {item.nome.trim().charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.testi}>
              <Text style={[styles.nome, { color: t.testo }]} numberOfLines={1}>
                {item.nome}
              </Text>
              {!!item.indirizzo && (
                <Text
                  style={[styles.dettaglio, { color: t.testoSecondario }]}
                  numberOfLines={1}
                >
                  {item.indirizzo}
                </Text>
              )}
            </View>
            <Feather name="chevron-right" size={20} color={t.testoSecondario} />
          </Pressable>
        )}
      />

      <Pressable
        onPress={nuovoCliente}
        style={({ pressed }) => [
          styles.bottone,
          { borderColor: t.testoSecondario },
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
      >
        <Feather name="user-plus" size={18} color={t.testo} />
        <Text style={[styles.bottoneTesto, { color: t.testo }]}>
          Nuovo cliente
        </Text>
      </Pressable>
    </FoglioInBasso>
  );
}
