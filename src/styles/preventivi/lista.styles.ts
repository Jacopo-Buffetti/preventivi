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

  filtriContenitore: { marginHorizontal: -20 },
  filtri: { gap: 8, paddingHorizontal: 20 },
  filtro: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  filtroTesto: { fontSize: 13, fontFamily: FONT.semi },

  titoloPeriodo: {
    fontSize: 13,
    fontFamily: FONT.grassetto,
    paddingTop: 18,
    paddingBottom: 8,
  },

  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  rigaTesti: { flex: 1, minWidth: 0, gap: 3 },
  rigaNumero: {
    fontSize: 12,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  rigaOggetto: { fontSize: 16, fontFamily: FONT.grassetto },
  rigaCliente: { fontSize: 13, fontFamily: FONT.regolare },
  rigaDestra: { alignItems: 'flex-end', gap: 6 },
  rigaImporto: {
    fontSize: 16,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  barrato: { textDecorationLine: 'line-through' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTesto: { fontSize: 11, fontFamily: FONT.grassetto },

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
