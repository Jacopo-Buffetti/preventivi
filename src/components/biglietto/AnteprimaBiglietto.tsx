import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import type { Biglietto } from '../../services/bigliettoService';

// Misure di riferimento del biglietto, come nel template HTML (rapporto ~85x55 mm)
const LARGHEZZA_BASE = 360;
const ALTEZZA_BASE = 230;

const COLORI = {
  carta: '#FFFFFF',
  bordo: '#CBD5E1',
  separatore: '#E2E8F0',
  testo: '#0F172A',
  testoDettagli: '#334155',
  testoSecondario: '#475569',
  testoLegale: '#64748B',
  oro: '#B45309',
  oroChiaro: '#F59E0B',
};

const MONOSPACE = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

interface Props {
  dati: Biglietto;
  lato: 'fronte' | 'retro';
  larghezza: number;
}

// Disegna il biglietto da visita. Tutte le misure sono scalate in base alla larghezza,
// così il biglietto mantiene le proporzioni su qualsiasi schermo.
export function AnteprimaBiglietto({ dati, lato, larghezza }: Props) {
  const s = larghezza / LARGHEZZA_BASE;
  const px = (valore: number) => valore * s;

  return (
    <View
      style={[
        styles.carta,
        {
          width: larghezza,
          height: ALTEZZA_BASE * s,
          borderRadius: px(12),
          padding: px(20),
        },
      ]}
    >
      {/* Barra decorativa superiore: tre tonalità al posto del gradiente */}
      <View style={[styles.barra, { height: px(4) }]}>
        <View style={[styles.barraParte, { backgroundColor: COLORI.oro }]} />
        <View
          style={[styles.barraParte, { backgroundColor: COLORI.oroChiaro }]}
        />
        <View style={[styles.barraParte, { backgroundColor: COLORI.oro }]} />
      </View>

      {lato === 'fronte' ? (
        <Fronte dati={dati} px={px} />
      ) : (
        <Retro dati={dati} px={px} />
      )}
    </View>
  );
}

function Logo({
  uri,
  dimensione,
  px,
}: {
  uri?: string;
  dimensione: number;
  px: (v: number) => number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: px(dimensione), height: px(dimensione) }}
        resizeMode="contain"
        accessibilityLabel="Logo"
      />
    );
  }
  return (
    <View
      style={[
        styles.logoVuoto,
        { width: px(dimensione), height: px(dimensione), borderRadius: px(8) },
      ]}
    >
      <Text
        style={[
          styles.logoVuotoTesto,
          { fontSize: px(dimensione > 60 ? 11 : 7) },
        ]}
      >
        LOGO
      </Text>
    </View>
  );
}

function Fronte({ dati, px }: { dati: Biglietto; px: (v: number) => number }) {
  return (
    <View style={styles.fronte}>
      <Logo uri={dati.logo} dimensione={110} px={px} />
      {!!dati.descrizione_fronte && (
        <Text
          style={[
            styles.sottotitoloFronte,
            {
              fontSize: px(10),
              letterSpacing: px(1.5),
              marginTop: px(6),
              paddingTop: px(6),
            },
          ]}
          numberOfLines={2}
        >
          {dati.descrizione_fronte.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function Retro({ dati, px }: { dati: Biglietto; px: (v: number) => number }) {
  const dettagli = [
    { icona: '📍', valore: dati.indirizzo },
    { icona: '📞', valore: dati.telefono },
    { icona: '📱', valore: dati.cellulare },
    { icona: '✉️', valore: dati.email },
    { icona: '✉️', valore: dati.email_secondaria },
  ].filter((d) => d.valore && d.valore.trim() !== '');

  const legali = [
    dati.p_iva && `P.IVA ${dati.p_iva}`,
    dati.codice_fiscale && `C.F. ${dati.codice_fiscale}`,
    dati.rea && `REA ${dati.rea}`,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.retro}>
      <View style={[styles.retroTesta, { paddingBottom: px(8) }]}>
        <View style={styles.flex}>
          <Text
            style={[styles.nome, { fontSize: px(15), letterSpacing: px(0.5) }]}
            numberOfLines={1}
          >
            {(dati.nome || 'Nome attività').toUpperCase()}
          </Text>
          {!!dati.descrizione_retro && (
            <Text
              style={[styles.titolo, { fontSize: px(9) }]}
              numberOfLines={1}
            >
              {dati.descrizione_retro.toUpperCase()}
            </Text>
          )}
        </View>
        <Logo uri={dati.logo} dimensione={44} px={px} />
      </View>

      <View style={[styles.dettagli, { gap: px(5) }]}>
        {dettagli.map((d, i) => (
          <View key={i} style={[styles.dettaglio, { gap: px(6) }]}>
            <Text
              style={{ fontSize: px(10), width: px(14), textAlign: 'center' }}
            >
              {d.icona}
            </Text>
            <Text
              style={[styles.dettaglioTesto, { fontSize: px(10.5) }]}
              numberOfLines={1}
            >
              {d.valore}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.legale, { paddingTop: px(6) }]}>
        {legali.map((l) => (
          <Text
            key={l}
            style={[styles.legaleTesto, { fontSize: px(8) }]}
            numberOfLines={1}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carta: {
    backgroundColor: COLORI.carta,
    borderWidth: 1,
    borderColor: COLORI.bordo,
    overflow: 'hidden',
    boxShadow: '0px 10px 25px -5px rgba(0, 0, 0, 0.25)',
  },
  barra: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  barraParte: { flex: 1 },
  flex: { flex: 1 },

  logoVuoto: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORI.bordo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoVuotoTesto: {
    color: COLORI.testoLegale,
    fontWeight: '700',
    letterSpacing: 1,
  },

  fronte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sottotitoloFronte: {
    color: COLORI.testoSecondario,
    fontWeight: '700',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORI.separatore,
    width: '85%',
  },

  retro: { flex: 1, justifyContent: 'space-between' },
  retroTesta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORI.separatore,
    gap: 8,
  },
  nome: { color: COLORI.testo, fontWeight: '800' },
  titolo: { color: COLORI.oro, fontWeight: '700' },
  dettagli: { flex: 1, justifyContent: 'center' },
  dettaglio: { flexDirection: 'row', alignItems: 'center' },
  dettaglioTesto: { color: COLORI.testoDettagli, fontWeight: '500', flex: 1 },
  legale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  legaleTesto: {
    color: COLORI.testoLegale,
    fontFamily: MONOSPACE,
    fontWeight: '600',
  },
});
