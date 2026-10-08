import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  // Testo blu notte sul pulsante ottone (il bianco sull'ottone si legge male)
  text: { fontSize: 16, fontFamily: FONT.pieno },
});
