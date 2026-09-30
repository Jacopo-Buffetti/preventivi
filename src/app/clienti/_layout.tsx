import { Stack } from 'expo-router';
import { useTema } from '../../constants/tema';

// Pila di pagine della sezione: lista, nuovo e dettaglio si aprono una sopra l'altra
// restando dentro la stessa scheda, così la barra in basso rimane visibile.
export const unstable_settings = {
  // Se si entra direttamente da "nuovo" o dal dettaglio, sotto c'è comunque la lista
  initialRouteName: 'index',
};

export default function SezioneLayout() {
  const t = useTema();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.sfondo },
      }}
    />
  );
}
