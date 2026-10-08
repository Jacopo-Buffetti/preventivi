import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { alignItems: 'center', justifyContent: 'center' },

  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  annulla: {
    width: 80,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  annullaTesto: { fontSize: 15, fontFamily: FONT.semi },
  titoloBarra: { fontSize: 17, fontFamily: FONT.pieno },

  contenuto: {
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  note: { minHeight: 100 },

  barraSalva: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  salva: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salvaTesto: { fontSize: 16, fontFamily: FONT.pieno },

  disabilitato: { opacity: 0.6 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
