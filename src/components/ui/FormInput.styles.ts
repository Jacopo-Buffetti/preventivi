import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  gruppo: { marginBottom: 16, gap: 6 },
  etichetta: { fontSize: 13, fontFamily: FONT.grassetto },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONT.regolare,
  },
  aiuto: { fontSize: 12, fontFamily: FONT.regolare },
});
