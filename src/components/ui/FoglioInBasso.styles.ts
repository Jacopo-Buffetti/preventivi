import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  contenitore: { flex: 1, justifyContent: 'flex-end' },
  foglio: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  maniglia: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  testa: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titolo: { fontSize: 20, fontFamily: FONT.pieno, flexShrink: 1 },
  chiudi: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
