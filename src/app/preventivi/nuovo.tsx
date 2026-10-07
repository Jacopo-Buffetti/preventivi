import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FoglioNuovaVoce,
  type NuovaVoce,
} from '../../components/preventivi/FoglioNuovaVoce';
import { SelettoreCliente } from '../../components/preventivi/SelettoreCliente';
import { prendiClienteCreato } from '../../utils/clienteAppenaCreato';
import { avviso } from '../../utils/dialoghi';
import { FONT, useTema, type Tema } from '../../constants/tema';
import {
  getClienteById,
  getPreventivoById,
  getVociByPreventivoId,
  savePreventivoWithVoci,
  type Cliente,
} from '../../services/databaseService';
import { updatePreventivoWithVoci } from '../../services/modificaPreventivoService';
import {
  formattaData,
  formattaEuro,
  formattaNumeroPreventivo,
} from '../../utils/formato';

const ALIQUOTA_IVA = 22;

interface VoceInLista extends NuovaVoce {
  chiave: string; // solo per la lista a schermo, non viene salvata
}

export default function NuovoPreventivoScreen() {
  const router = useRouter();
  // idCliente: arrivando dal dettaglio di un cliente, il cliente è già scelto
  // idPreventivo: la pagina serve a modificare un preventivo esistente
  const { idCliente, idPreventivo } = useLocalSearchParams<{
    idCliente?: string;
    idPreventivo?: string;
  }>();
  const inModifica = !!idPreventivo;
  const t = useTema();
  const insets = useSafeAreaInsets();

  const [numero, setNumero] = useState<number | null>(null);
  const [anno, setAnno] = useState(new Date().getFullYear());
  const [dataEmissione, setDataEmissione] = useState<string>(
    new Date().toISOString()
  );
  const [aliquotaIva, setAliquotaIva] = useState(ALIQUOTA_IVA);
  const [note, setNote] = useState(''); // non modificabili qui, ma da conservare
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [oggetto, setOggetto] = useState('');
  const [voci, setVoci] = useState<VoceInLista[]>([]);

  const [selettoreAperto, setSelettoreAperto] = useState(false);
  const [foglioAperto, setFoglioAperto] = useState(false);
  const [voceInModifica, setVoceInModifica] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [caricamento, setCaricamento] = useState(inModifica);

  // Modifica: carica il preventivo esistente con le sue voci e il cliente
  useEffect(() => {
    if (!idPreventivo) return;
    (async () => {
      try {
        const [p, vociSalvate] = await Promise.all([
          getPreventivoById(idPreventivo),
          getVociByPreventivoId(idPreventivo),
        ]);
        if (!p) {
          avviso('Errore', 'Preventivo non trovato.');
          router.back();
          return;
        }
        setNumero(p.numero_preventivo);
        setAnno(p.anno);
        setDataEmissione(p.data_creazione);
        setAliquotaIva(p.aliquota_iva);
        setNote(p.note_pagamento ?? '');
        setOggetto(p.oggetto ?? '');
        setVoci(
          vociSalvate.map((v) => ({
            chiave: v.id,
            descrizione: v.descrizione,
            quantita: v.quantita,
            prezzo_unitario: v.prezzo_unitario,
          }))
        );
        if (p.cliente_id) setCliente(await getClienteById(p.cliente_id));
      } catch (err) {
        console.error(err);
        avviso('Errore', 'Impossibile caricare il preventivo.');
      } finally {
        setCaricamento(false);
      }
    })();
  }, [idPreventivo]);

  useEffect(() => {
    if (!idCliente) return;
    getClienteById(idCliente)
      .then((c) => c && setCliente(c))
      .catch(console.error);
  }, [idCliente]);

  // Tornando dal form "Nuovo cliente" aperto da qui: il cliente appena
  // creato diventa il cliente del preventivo
  useFocusEffect(
    useCallback(() => {
      const idNuovo = prendiClienteCreato();
      if (!idNuovo) return;
      getClienteById(idNuovo)
        .then((c) => c && setCliente(c))
        .catch(console.error);
    }, [])
  );

  const imponibile = voci.reduce(
    (somma, v) => somma + v.quantita * v.prezzo_unitario,
    0
  );
  const iva = (imponibile * aliquotaIva) / 100;
  const totale = imponibile + iva;

  // Il foglio serve sia ad aggiungere una voce sia a modificarne una esistente
  const confermaVoce = (voce: NuovaVoce) => {
    if (voceInModifica) {
      setVoci((attuali) =>
        attuali.map((v) =>
          v.chiave === voceInModifica ? { ...voce, chiave: v.chiave } : v
        )
      );
    } else {
      setVoci((attuali) => [
        ...attuali,
        { ...voce, chiave: `${Date.now()}-${attuali.length}` },
      ]);
    }
    chiudiFoglio();
  };

  const apriNuovaVoce = () => {
    setVoceInModifica(null);
    setFoglioAperto(true);
  };

  const apriModificaVoce = (chiave: string) => {
    setVoceInModifica(chiave);
    setFoglioAperto(true);
  };

  const chiudiFoglio = () => {
    setFoglioAperto(false);
    setVoceInModifica(null);
  };

  const voceDaModificare =
    voci.find((v) => v.chiave === voceInModifica) ?? null;

  const rimuoviVoce = (chiave: string) =>
    setVoci((attuali) => attuali.filter((v) => v.chiave !== chiave));

  const salva = async () => {
    if (!cliente) {
      avviso('Attenzione', 'Scegli il cliente del preventivo.');
      return;
    }
    if (voci.length === 0) {
      avviso('Attenzione', 'Aggiungi almeno una voce di costo.');
      return;
    }

    const dati = {
      cliente_id: cliente.id,
      oggetto: oggetto.trim(),
      aliquota_iva: aliquotaIva,
      note_pagamento: note,
      voci: voci.map(({ descrizione, quantita, prezzo_unitario }) => ({
        descrizione,
        quantita,
        prezzo_unitario,
      })),
    };

    // Modifica: salva e torna al dettaglio, che si ricarica da solo
    if (idPreventivo) {
      try {
        setSalvando(true);
        await updatePreventivoWithVoci(idPreventivo, dati);
        router.back();
      } catch (err) {
        console.error(err);
        avviso('Errore', 'Impossibile salvare le modifiche.');
      } finally {
        setSalvando(false);
      }
      return;
    }

    // Nuovo preventivo: si salva come bozza e si apre il dettaglio.
    // Il PDF NON si genera qui: una bozza non ha ancora il numero, che
    // viene assegnato dal server al primo invio dal dettaglio (WhatsApp,
    // email, stampa). Generarlo qui farebbe uscire un PDF "N. Bozza".
    try {
      setSalvando(true);
      const id = await savePreventivoWithVoci(dati);

      // replace: con "indietro" dal dettaglio si torna alla lista, non al form
      router.replace({
        pathname: '/preventivi/[idPreventivo]',
        params: { idPreventivo: id },
      });
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile salvare il preventivo.');
    } finally {
      setSalvando(false);
    }
  };

  if (caricamento) {
    return (
      <View
        style={[styles.container, styles.centro, { backgroundColor: t.sfondo }]}
      >
        <ActivityIndicator color={t.ottone} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      {/* --- BARRA IN ALTO --- */}
      <View style={[styles.barra, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          style={styles.annulla}
        >
          <Text style={[styles.annullaTesto, { color: t.testoSecondario }]}>
            Annulla
          </Text>
        </Pressable>
        <Text
          style={[styles.titoloBarra, { color: t.testo }]}
          accessibilityRole="header"
        >
          {inModifica ? 'Modifica preventivo' : 'Nuovo preventivo'}
        </Text>
        <View style={styles.annulla} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.contenuto, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Numero e data: informazioni, non campi da compilare */}
        <View style={styles.info}>
          <Text style={[styles.infoTesto, { color: t.testoSecondario }]}>
            {numero !== null
              ? `Preventivo N. ${formattaNumeroPreventivo(anno, numero)}`
              : 'Bozza: il numero viene assegnato al primo invio'}
          </Text>
          <Text style={[styles.infoTesto, { color: t.testoSecondario }]}>
            Data {formattaData(dataEmissione)}
          </Text>
        </View>

        {/* --- CLIENTE --- */}
        <Sezione t={t} titolo="Cliente">
          <Pressable
            onPress={() => setSelettoreAperto(true)}
            style={({ pressed }) => [
              styles.scelta,
              {
                backgroundColor: t.card,
                borderColor: cliente ? t.bordo : t.testoSecondario,
              },
              !cliente && styles.tratteggiato,
              pressed && styles.premuto,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              cliente
                ? `Cliente: ${cliente.nome}. Tocca per cambiarlo`
                : 'Scegli il cliente'
            }
          >
            <View
              style={[styles.iconaRiquadro, { backgroundColor: t.riquadro }]}
            >
              <Feather
                name={cliente ? 'user' : 'user-plus'}
                size={20}
                color={t.testo}
              />
            </View>
            <View style={styles.sceltaTesti}>
              <Text
                style={[
                  styles.sceltaTitolo,
                  { color: cliente ? t.testo : t.testoSecondario },
                ]}
                numberOfLines={1}
              >
                {cliente ? cliente.nome : 'Scegli il cliente'}
              </Text>
              {!!cliente?.indirizzo && (
                <Text
                  style={[styles.sceltaSotto, { color: t.testoSecondario }]}
                  numberOfLines={1}
                >
                  {cliente.indirizzo}
                </Text>
              )}
            </View>
            <Text style={[styles.cambia, { color: t.accento }]}>
              {cliente ? 'Cambia' : ''}
            </Text>
            {!cliente && (
              <Feather
                name="chevron-right"
                size={20}
                color={t.testoSecondario}
              />
            )}
          </Pressable>
        </Sezione>

        {/* --- OGGETTO --- */}
        <Sezione t={t} titolo="Lavoro">
          <TextInput
            value={oggetto}
            onChangeText={setOggetto}
            placeholder="es. Ringhiera scala esterna"
            placeholderTextColor={t.testoSecondario}
            style={[
              styles.input,
              {
                backgroundColor: t.input,
                borderColor: t.bordo,
                color: t.testo,
              },
            ]}
            accessibilityLabel="Oggetto del lavoro"
          />
        </Sezione>

        {/* --- VOCI --- */}
        <Sezione
          t={t}
          titolo="Lavori e materiali"
          contatore={voci.length > 0 ? String(voci.length) : undefined}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: t.card, borderColor: t.bordo },
            ]}
          >
            {voci.map((v) => (
              <View
                key={v.chiave}
                style={[styles.voce, { borderBottomColor: t.bordo }]}
              >
                <Pressable
                  onPress={() => apriModificaVoce(v.chiave)}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifica ${v.descrizione}`}
                  style={({ pressed }) => [
                    styles.voceTocco,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.voceTesti}>
                    <Text style={[styles.voceDescrizione, { color: t.testo }]}>
                      {v.descrizione}
                    </Text>
                    <Text
                      style={[styles.voceMeta, { color: t.testoSecondario }]}
                    >
                      {v.quantita.toLocaleString('it-IT')} ×{' '}
                      {formattaEuro(v.prezzo_unitario)}
                    </Text>
                  </View>
                  <Text style={[styles.voceTotale, { color: t.testo }]}>
                    {formattaEuro(v.quantita * v.prezzo_unitario)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => rimuoviVoce(v.chiave)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Elimina ${v.descrizione}`}
                  style={({ pressed }) => [
                    styles.iconaPiccola,
                    { backgroundColor: t.riquadro },
                    pressed && styles.premuto,
                  ]}
                >
                  <Feather name="trash-2" size={17} color={t.pericolo} />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={apriNuovaVoce}
              style={({ pressed }) => [
                styles.aggiungi,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
            >
              <Feather name="plus-circle" size={20} color={t.accento} />
              <Text style={[styles.aggiungiTesto, { color: t.accento }]}>
                {voci.length === 0
                  ? 'Aggiungi la prima voce'
                  : 'Aggiungi una voce'}
              </Text>
            </Pressable>
          </View>

          {/* Totali, sempre aggiornati */}
          {voci.length > 0 && (
            <View style={[styles.totali, { backgroundColor: t.riquadro }]}>
              <RigaTotale
                etichetta="Imponibile"
                valore={formattaEuro(imponibile)}
                t={t}
              />
              <RigaTotale
                etichetta={`IVA ${aliquotaIva}%`}
                valore={formattaEuro(iva)}
                t={t}
              />
            </View>
          )}
        </Sezione>
      </ScrollView>

      {/* --- BARRA IN BASSO: totale e salvataggio --- */}
      <View
        style={[
          styles.barraSalva,
          {
            backgroundColor: t.barraTab,
            borderTopColor: t.bordo,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View style={styles.totaleBox}>
          <Text style={[styles.totaleEtichetta, { color: t.testoSecondario }]}>
            Totale con IVA
          </Text>
          <Text
            style={[styles.totaleValore, { color: t.testo }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formattaEuro(totale)}
          </Text>
        </View>
        <Pressable
          onPress={salva}
          disabled={salvando}
          style={({ pressed }) => [
            styles.salva,
            { backgroundColor: t.bottonePrimario },
            salvando && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          {salvando ? (
            <ActivityIndicator color={t.testoSuPrimario} />
          ) : (
            <Text style={[styles.salvaTesto, { color: t.testoSuPrimario }]}>
              {inModifica ? 'Salva modifiche' : 'Salva bozza'}
            </Text>
          )}
        </Pressable>
      </View>

      <SelettoreCliente
        visibile={selettoreAperto}
        onChiudi={() => setSelettoreAperto(false)}
        onScegli={(c) => {
          setCliente(c);
          setSelettoreAperto(false);
        }}
      />
      <FoglioNuovaVoce
        visibile={foglioAperto}
        onChiudi={chiudiFoglio}
        onAggiungi={confermaVoce}
        voceDaModificare={voceDaModificare}
      />
    </View>
  );
}

function Sezione({
  t,
  titolo,
  contatore,
  children,
}: {
  t: Tema;
  titolo: string;
  contatore?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sezione}>
      <View style={styles.testaSezione}>
        <Text
          style={[styles.titoloSezione, { color: t.testo }]}
          accessibilityRole="header"
        >
          {titolo}
        </Text>
        {!!contatore && (
          <View style={[styles.contatore, { backgroundColor: t.riquadro }]}>
            <Text style={[styles.contatoreTesto, { color: t.testoSecondario }]}>
              {contatore}
            </Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function RigaTotale({
  etichetta,
  valore,
  t,
}: {
  etichetta: string;
  valore: string;
  t: Tema;
}) {
  return (
    <View style={styles.rigaTotale}>
      <Text style={[styles.rigaTesto, { color: t.testoSecondario }]}>
        {etichetta}
      </Text>
      <Text
        style={[styles.rigaTesto, styles.cifre, { color: t.testoSecondario }]}
      >
        {valore}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    gap: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  info: { gap: 2, marginTop: 4 },
  infoTesto: { fontSize: 13, fontFamily: FONT.regolare },

  sezione: { gap: 10 },
  testaSezione: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titoloSezione: { fontSize: 16, fontFamily: FONT.pieno },
  contatore: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  contatoreTesto: { fontSize: 12, fontFamily: FONT.grassetto },

  scelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingLeft: 12,
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 68,
  },
  tratteggiato: { borderStyle: 'dashed', borderWidth: 1.5 },
  sceltaTesti: { flex: 1, minWidth: 0, gap: 2 },
  sceltaTitolo: { fontSize: 16, fontFamily: FONT.grassetto },
  sceltaSotto: { fontSize: 13, fontFamily: FONT.regolare },
  cambia: { fontSize: 14, fontFamily: FONT.grassetto },

  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONT.regolare,
  },

  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  voce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
    borderBottomWidth: 1,
  },
  voceTocco: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 16,
  },
  voceTesti: { flex: 1, minWidth: 0, gap: 3 },
  voceDescrizione: { fontSize: 15, fontFamily: FONT.grassetto },
  voceMeta: {
    fontSize: 13,
    fontFamily: FONT.regolare,
    fontVariant: ['tabular-nums'],
  },
  voceTotale: {
    fontSize: 15,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  iconaPiccola: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconaRiquadro: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aggiungi: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
  },
  aggiungiTesto: { fontSize: 15, fontFamily: FONT.grassetto },

  totali: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  rigaTotale: { flexDirection: 'row', justifyContent: 'space-between' },
  rigaTesto: { fontSize: 14, fontFamily: FONT.regolare },
  cifre: { fontVariant: ['tabular-nums'] },

  barraSalva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totaleBox: { flex: 1, minWidth: 0 },
  totaleEtichetta: { fontSize: 12, fontFamily: FONT.regolare },
  totaleValore: {
    fontSize: 22,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  salva: {
    height: 56,
    paddingHorizontal: 22,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  salvaTesto: { fontSize: 16, fontFamily: FONT.pieno },

  disabilitato: { opacity: 0.6 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
