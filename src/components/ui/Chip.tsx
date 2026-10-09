import { Pressable, Text } from 'react-native';
import { FONT, useTema } from '../../constants/tema';
import { styles } from './Chip.styles';

interface Props {
  testo: string;
  attivo: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

// Pulsantino a pillola da scegliere (voci rapide, unità di misura).
// Attivo: pieno color ottone; non attivo: contorno.
export function Chip({ testo, attivo, onPress, accessibilityLabel }: Props) {
  const t = useTema();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: attivo ? t.bottonePrimario : t.inputFoglio,
          borderColor: attivo ? t.bottonePrimario : t.bordo,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: attivo }}
      accessibilityLabel={accessibilityLabel}
    >
      <Text
        style={[
          styles.testo,
          {
            color: attivo ? t.testoSuPrimario : t.testo,
            fontFamily: attivo ? FONT.grassetto : FONT.semi,
          },
        ]}
        numberOfLines={1}
      >
        {testo}
      </Text>
    </Pressable>
  );
}
