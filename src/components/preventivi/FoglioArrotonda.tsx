import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FONT, useTema, type Tema } from '../../constants/tema';
import {
  formattaEuro,
  formattaPercentuale,
  leggiNumero,
  percentualeSconto,
  proposteArrotondamento,
} from '../../utils/formato';
import { FoglioInBasso } from '../ui/FoglioInBasso';

interface Props {
  visibile: boolean;
  totaleConIva: number;
  scontoAttuale: number; // 0 = nessun arrotondamento applicato
  onChiudi: () => void;
  onApplica: (sconto: number) => void;
}

// Foglio che sale dal basso per arrotondare il totale con IVA.
// Si sceglie il totale finale (es. 240 invece di 244): la differenza
// diventa uno sconto, che nel PDF compare con la sua percentuale.
export function FoglioArrotonda({
  visibile,
  totaleConIva,
  scontoAttuale,
  onChiudi,
  onApplica,
}: Props) {
  const t = useTema();
  const [testo, setTesto] = useState('');

  const proposte = proposteArrotondamento(totaleConIva);

  // A ogni apertura: il totale già arrotondato, se c'è, altrimenti
  // la prima proposta (la decina sotto il totale)
  useEffect(() => {
    if (!visibile) return;
    const iniziale =
      scontoAttuale > 0
        ? Math.round((totaleConIva - scontoAttuale) * 100) / 100
        : (proposteArrotondamento(totaleConIva)[0] ?? null);
    setTesto(iniziale !== null ? numeroInTesto(iniziale) : '');
  }, [visibile, totaleConIva, scontoAttuale]);

  const finale = leggiNumero(testo);
  const sconto =
    finale !== null ? Math.round((totaleConIva - finale) * 100) / 100 : 0;
  const valido = finale !== null && finale > 0 && sconto > 0;

  const stileInput = [
    styles.input,
    { backgroundColor: t.inputFoglio, borderColor: t.bordo, color: t.testo },
  ];

  return (
    <FoglioInBasso
      visibile={visibile}
      titolo="Arrotonda il totale"
      onChiudi={onChiudi}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={[styles.riquadro, { backgroundColor: t.riquadro }]}>
          <Text
            style={[styles.riquadroEtichetta, { color: t.testoSecondario }]}
          >
            Totale con IVA
          </Text>
          <Text style={[styles.riquadroValore, { color: t.testo }]}>
            {formattaEuro(totaleConIva)}
          </Text>
        </View>

        {proposte.length > 0 && (
          <>
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              Arrotonda a
            </Text>
            <View style={styles.chips}>
              {proposte.map((p) => (
                <Chip
                  key={p}
                  t={t}
                  testo={formattaEuroIntero(p)}
                  attivo={finale === p}
                  onPress={() => setTesto(numeroInTesto(p))}
                />
              ))}
            </View>
          </>
        )}

        <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
          Oppure scrivi il totale finale (€)
        </Text>
        <TextInput
          value={testo}
          onChangeText={setTesto}
          keyboardType="decimal-pad"
          placeholder="0,00"
          placeholderTextColor={t.testoSecondario}
          style={[...stileInput, styles.cifre]}
          selectTextOnFocus
          accessibilityLabel="Totale finale in euro"
        />

        {/* Anteprima di quello che uscirà sul PDF */}
        <View style={[styles.anteprima, { backgroundColor: t.riquadro }]}>
          {valido ? (
            <>
              <View style={styles.rigaAnteprima}>
                <Text
                  style={[styles.testoAnteprima, { color: t.testoSecondario }]}
                >
                  Sconto (
                  {formattaPercentuale(percentualeSconto(sconto, totaleConIva))}
                  )
                </Text>
                <Text
                  style={[
                    styles.testoAnteprima,
                    styles.cifre,
                    { color: t.testoSecondario },
                  ]}
                >
                  − {formattaEuro(sconto)}
                </Text>
              </View>
              <View style={styles.rigaAnteprima}>
                <Text style={[styles.totaleAnteprima, { color: t.testo }]}>
                  Totale finale
                </Text>
                <Text
                  style={[
                    styles.totaleAnteprima,
                    styles.cifre,
                    { color: t.testo },
                  ]}
                >
                  {formattaEuro(finale!)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.testoAnteprima, { color: t.testoSecondario }]}>
              Il totale finale deve essere più basso di{' '}
              {formattaEuro(totaleConIva)}.
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => valido && onApplica(sconto)}
          disabled={!valido}
          style={({ pressed }) => [
            styles.bottone,
            { backgroundColor: t.bottonePrimario },
            !valido && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !valido }}
        >
          <Text style={[styles.bottoneTesto, { color: t.testoSuPrimario }]}>
            Applica arrotondamento
          </Text>
        </Pressable>

        {scontoAttuale > 0 && (
          <Pressable
            onPress={() => onApplica(0)}
            style={({ pressed }) => [styles.togli, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <Text style={[styles.togliTesto, { color: t.pericolo }]}>
              Togli arrotondamento
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </FoglioInBasso>
  );
}

function Chip({
  t,
  testo,
  attivo,
  onPress,
}: {
  t: Tema;
  testo: string;
  attivo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: attivo ? t.bottonePrimario : t.inputFoglio,
          borderColor: attivo ? t.bottonePrimario : t.bordo,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: attivo }}
    >
      <Text
        style={[
          styles.chipTesto,
          {
            color: attivo ? t.testoSuPrimario : t.testo,
            fontFamily: attivo ? FONT.grassetto : FONT.semi,
          },
        ]}
      >
        {testo}
      </Text>
    </Pressable>
  );
}

// 240 → "240", 1287.5 → "1287,50": come lo scriverebbe l'utente
function numeroInTesto(valore: number): string {
  return Number.isInteger(valore)
    ? String(valore)
    : valore.toFixed(2).replace('.', ',');
}

// 1200 → "€ 1.200", senza centesimi: le proposte sono sempre cifre tonde
function formattaEuroIntero(valore: number): string {
  return `€ ${valore.toLocaleString('it-IT')}`;
}

const styles = StyleSheet.create({
  riquadro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  riquadroEtichetta: { fontSize: 14, fontFamily: FONT.semi },
  riquadroValore: {
    fontSize: 18,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  etichetta: {
    fontSize: 13,
    fontFamily: FONT.grassetto,
    marginTop: 14,
    marginBottom: 6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  chipTesto: { fontSize: 15, fontVariant: ['tabular-nums'] },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONT.regolare,
  },
  cifre: { fontVariant: ['tabular-nums'] },
  anteprima: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  rigaAnteprima: { flexDirection: 'row', justifyContent: 'space-between' },
  testoAnteprima: { fontSize: 14, fontFamily: FONT.regolare },
  totaleAnteprima: { fontSize: 16, fontFamily: FONT.pieno },
  bottone: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  bottoneTesto: { fontSize: 16, fontFamily: FONT.pieno },
  togli: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  togliTesto: { fontSize: 15, fontFamily: FONT.grassetto },
  disabilitato: { opacity: 0.45 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
