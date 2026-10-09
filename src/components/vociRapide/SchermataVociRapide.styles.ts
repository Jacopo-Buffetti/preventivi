import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  radice: { flex: 1 },
  contenuto: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 18,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  indietro: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: -6,
    minHeight: 44,
  },
  indietroTesto: { fontSize: 15, fontFamily: FONT.grassetto },
  intestazione: { gap: 4, marginTop: -8 },
  titolo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  sottotitolo: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regolare },

  // Riga dell'elenco: altezza fissa (la lista riordinabile ne ha bisogno),
  // descrizione su una riga sola
  riga: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rigaDescrizione: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: FONT.grassetto,
  },
  rigaPrezzo: { alignItems: 'flex-end' },
  rigaImporto: {
    fontSize: 15,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  rigaUnita: { fontSize: 12, fontFamily: FONT.medio },

  suggerimento: { flexDirection: 'row', gap: 8, marginTop: -6 },
  suggerimentoTesto: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: FONT.regolare,
  },

  nuova: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nuovaTesto: { fontSize: 16, fontFamily: FONT.pieno },

  vuoto: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  vuotoIcona: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  vuotoTitolo: { fontSize: 17, fontFamily: FONT.pieno },
  vuotoTesto: {
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: FONT.regolare,
    textAlign: 'center',
    marginBottom: 6,
  },

  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
