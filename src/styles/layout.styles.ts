import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titolo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  dettaglio: {
    fontSize: 14,
    textAlign: 'center',
  },
  iconaTab: { alignItems: 'center', justifyContent: 'center' },
  lineettaAttiva: {
    position: 'absolute',
    top: -9,
    width: 26,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
