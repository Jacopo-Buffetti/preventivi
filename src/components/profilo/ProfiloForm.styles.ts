import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  centro: { paddingVertical: 40, alignItems: 'center' },
  affiancati: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  salva: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  salvaTesto: { fontSize: 16, fontFamily: FONT.pieno },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
