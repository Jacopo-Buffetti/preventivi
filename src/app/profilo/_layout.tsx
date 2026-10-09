import { Stack } from 'expo-router';
import { useTema } from '../../constants/tema';

// Pila di pagine della sezione Profilo: il profilo e, sopra, le pagine che
// si aprono da lì (le voci rapide), restando dentro la stessa scheda.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function ProfiloLayout() {
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
