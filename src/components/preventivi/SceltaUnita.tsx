import { View } from 'react-native';
import { UNITA } from '../../constants/unita';
import { Chip } from '../ui/Chip';
import { styles } from './SceltaUnita.styles';

interface Props {
  valore: string | null;
  onCambia: (unita: string | null) => void;
}

// Scelta dell'unità di misura, facoltativa: si tocca un'unità per
// sceglierla e di nuovo per toglierla (nessuna unità).
export function SceltaUnita({ valore, onCambia }: Props) {
  return (
    <View style={styles.chips}>
      {UNITA.map((u) => (
        <Chip
          key={u.id}
          testo={u.nome}
          attivo={valore === u.id}
          onPress={() => onCambia(valore === u.id ? null : u.id)}
          accessibilityLabel={`Unità: ${u.nome}`}
        />
      ))}
    </View>
  );
}
