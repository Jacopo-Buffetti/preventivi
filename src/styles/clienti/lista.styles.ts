import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: {
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  intestazione: { gap: 14, marginBottom: 4 },
  titolo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  conteggio: { fontSize: 13, fontFamily: FONT.regolare },
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
    fontSize: 15,
    fontFamily: FONT.regolare,
    paddingVertical: 0,
  },

  lettera: {
    fontSize: 14,
    fontFamily: FONT.pieno,
    paddingTop: 18,
    paddingBottom: 8,
    paddingLeft: 4,
  },

  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  rigaPrima: {
    borderTopWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  rigaUltima: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  divisore: { position: 'absolute', top: 0, left: 66, right: 0, height: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: { fontSize: 14, fontFamily: FONT.pieno },
  testi: { flex: 1, minWidth: 0, gap: 2 },
  nome: { fontSize: 16, fontFamily: FONT.grassetto },
  dettaglio: { fontSize: 13, fontFamily: FONT.regolare },

  vuoto: { marginTop: 48 },
  vuotoTesto: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONT.regolare,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 20px rgba(7, 21, 34, 0.3)',
  },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
