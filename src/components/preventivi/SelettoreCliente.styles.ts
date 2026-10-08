import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  ricerca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  ricercaInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONT.regolare,
    paddingVertical: 0,
  },
  lista: { marginTop: 8 },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  iniziale: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inizialeTesto: { fontSize: 16, fontFamily: FONT.pieno },
  testi: { flex: 1, minWidth: 0, gap: 2 },
  nome: { fontSize: 15, fontFamily: FONT.grassetto },
  dettaglio: { fontSize: 13, fontFamily: FONT.regolare },
  vuoto: {
    textAlign: 'center',
    marginVertical: 24,
    fontSize: 14,
    fontFamily: FONT.regolare,
  },
  bottone: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  bottoneTesto: { fontSize: 15, fontFamily: FONT.grassetto },
});
