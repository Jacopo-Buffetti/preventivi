import { useLocalSearchParams } from 'expo-router';
import { PaginaSegnaposto } from '../../components/ui/PaginaSegnaposto';

export default function DettaglioClienteScreen() {
  // Il nome del parametro corrisponde al nome del file: [idCliente].tsx
  const { idCliente } = useLocalSearchParams<{ idCliente: string }>();

  return (
    <PaginaSegnaposto
      titolo="Dettaglio cliente"
      descrizione={`Qui compariranno i dati del cliente ${idCliente}.`}
    />
  );
}
