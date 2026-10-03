import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { FoglioNuovaVoce, type NuovaVoce } from '../../components/preventivi/FoglioNuovaVoce';
import { descriviCliente, SelettoreCliente } from '../../components/preventivi/SelettoreCliente';
import { avviso } from '../../utils/dialoghi';
import { useTema, type Tema } from '../../constants/tema';
import {
  getClienteById,
  getPreventivoById,
  getProssimoNumeroPreventivo,
  getVociByPreventivoId,
  savePreventivoWithVoci,
  type Cliente,
} from '../../services/databaseService';
import { updatePreventivoWithVoci } from '../../services/modificaPreventivoService';
import { condividiPdfPreventivo } from '../../services/pdfService';
import { formattaData, formattaEuro, formattaNumeroPreventivo } from '../../utils/formato';

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
  const [dataEmissione, setDataEmissione] = useState<string>(new Date().toISOString());
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

  // Nuovo preventivo: numero provvisorio da mostrare, quello definitivo viene
  // assegnato al salvataggio
  useEffect(() => {
    if (inModifica) return;
    getProssimoNumeroPreventivo(new Date().getFullYear()).then(setNumero).catch(console.error);
  }, [inModifica]);

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

  const imponibile = voci.reduce((somma, v) => somma + v.quantita * v.prezzo_unitario, 0);
  const iva = (imponibile * aliquotaIva) / 100;
  const totale = imponibile + iva;

  // Il foglio serve sia ad aggiungere una voce sia a modificarne una esistente
  const confermaVoce = (voce: NuovaVoce) => {
    if (voceInModifica) {
      setVoci((attuali) =>
        attuali.map((v) => (v.chiave === voceInModifica ? { ...voce, chiave: v.chiave } : v))
      );
    } else {
      setVoci((attuali) => [...attuali, { ...voce, chiave: `${Date.now()}-${attuali.length}` }]);
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

  const voceDaModificare = voci.find((v) => v.chiave === voceInModifica) ?? null;

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

    try {
      setSalvando(true);
      const id = await savePreventivoWithVoci(dati);

      // Il preventivo è salvato: un errore nel PDF non deve farlo sembrare perso
      try {
        await condividiPdfPreventivo(id);
      } catch (errPdf) {
        console.error(errPdf);
        avviso(
          'Preventivo salvato',
          'Il preventivo è stato salvato, ma non è stato possibile generare il PDF.'
        );
      }

      // replace: con "indietro" dal dettaglio si torna alla lista, non al form
      router.replace({ pathname: '/preventivi/[idPreventivo]', params: { idPreventivo: id } });
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile salvare il preventivo.');
    } finally {
      setSalvando(false);
    }
  };

  const stileCampo = [styles.campo, { backgroundColor: t.input, borderColor: t.bordo }];

  if (caricamento) {
    return (
      <View style={[styles.container, styles.centro, { backgroundColor: t.sfondo }]}>
        <ActivityIndicator color={t.accento} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      {/* Barra superiore */}
      <View style={[styles.barra, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.annulla, { color: t.testoSecondario }]}>Annulla</Text>
        </Pressable>
        <Text style={[styles.titoloBarra, { color: t.testo }]}>
          {inModifica ? 'Modifica Preventivo' : 'Nuovo Preventivo'}
        </Text>
        <View style={styles.segnapostoBarra} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.contenuto, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Etichetta testo="CLIENTE" t={t} />
        <Pressable
          onPress={() => setSelettoreAperto(true)}
          style={stileCampo}
          accessibilityRole="button"
          accessibilityLabel="Scegli il cliente"
        >
          <Text
            style={[styles.campoTesto, { color: cliente ? t.testo : t.testoSecondario }]}
            numberOfLines={1}
          >
            {cliente ? descriviCliente(cliente) : 'Tocca per scegliere un cliente'}
          </Text>
          <Text style={{ color: t.testoSecondario }}>▾</Text>
        </Pressable>

        <Etichetta testo="N° PREVENTIVO" t={t} />
        <View style={stileCampo}>
          <Text style={[styles.campoTesto, { color: t.testo }]}>
            {numero !== null ? formattaNumeroPreventivo(anno, numero) : '…'}
          </Text>
        </View>

        <Etichetta testo="DATA" t={t} />
        <View style={stileCampo}>
          <Text style={[styles.campoTesto, { color: t.testo }]}>{formattaData(dataEmissione)}</Text>
        </View>

        <Etichetta testo="OGGETTO DEL LAVORO" t={t} />
        <TextInput
          value={oggetto}
          onChangeText={setOggetto}
          placeholder="es. Realizzazione ringhiera scala esterna"
          placeholderTextColor={t.testoSecondario}
          style={[...stileCampo, styles.campoInput, { color: t.testo }]}
        />

        {/* Voci di costo */}
        <View style={styles.intestazioneVoci}>
          <Text style={[styles.etichetta, styles.senzaMargine, { color: t.testoSecondario }]}>
            VOCI DI COSTO ({voci.length})
          </Text>
          <Pressable onPress={apriNuovaVoce} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.linkAggiungi, { color: t.accento }]}>+ AGGIUNGI VOCE</Text>
          </Pressable>
        </View>

        {voci.map((v) => (
          <View
            key={v.chiave}
            style={[styles.voce, { backgroundColor: t.card, borderColor: t.bordo }]}
          >
            <View style={styles.voceTesta}>
              <Text style={[styles.voceDescrizione, { color: t.testo }]}>{v.descrizione}</Text>
              <View style={styles.voceAzioni}>
                <Pressable
                  onPress={() => apriModificaVoce(v.chiave)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Modifica ${v.descrizione}`}
                >
                  <Text style={styles.cestino}>✏️</Text>
                </Pressable>
                <Pressable
                  onPress={() => rimuoviVoce(v.chiave)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Elimina ${v.descrizione}`}
                >
                  <Text style={styles.cestino}>🗑️</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.voceDettagli}>
              <Text style={[styles.voceMeta, { color: t.testoSecondario }]}>
                Q.tà: {v.quantita.toLocaleString('it-IT')}
              </Text>
              <Text style={[styles.voceMeta, { color: t.testoSecondario }]}>
                Prezzo: {formattaEuro(v.prezzo_unitario)}
              </Text>
              <Text style={[styles.voceTotale, { color: t.accento }]}>
                Tot: {formattaEuro(v.quantita * v.prezzo_unitario)}
              </Text>
            </View>
          </View>
        ))}

        <Pressable
          onPress={apriNuovaVoce}
          style={({ pressed }) => [
            styles.aggiungiTratteggiato,
            { borderColor: t.accento, backgroundColor: t.card },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.aggiungiTesto, { color: t.accento }]}>＋ Aggiungi Voce</Text>
        </Pressable>

        {/* Riepilogo */}
        <View style={[styles.riepilogo, { backgroundColor: t.card, borderTopColor: t.accento }]}>
          <RigaTotale etichetta="Imponibile:" valore={formattaEuro(imponibile)} t={t} />
          <RigaTotale etichetta={`IVA (${aliquotaIva}%):`} valore={formattaEuro(iva)} t={t} />
          <View style={[styles.separatore, { backgroundColor: t.bordo }]} />
          <View style={styles.rigaTotale}>
            <Text style={[styles.totaleEtichetta, { color: t.testo }]}>TOTALE:</Text>
            <Text style={[styles.totaleValore, { color: t.accento }]}>{formattaEuro(totale)}</Text>
          </View>
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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.salvaTesto}>
              {inModifica ? '💾 Salva modifiche' : '💾 Salva e Genera PDF'}
            </Text>
          )}
        </Pressable>
      </ScrollView>

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

function Etichetta({ testo, t }: { testo: string; t: Tema }) {
  return <Text style={[styles.etichetta, { color: t.testoSecondario }]}>{testo}</Text>;
}

function RigaTotale({ etichetta, valore, t }: { etichetta: string; valore: string; t: Tema }) {
  return (
    <View style={styles.rigaTotale}>
      <Text style={[styles.rigaEtichetta, { color: t.testoSecondario }]}>{etichetta}</Text>
      <Text style={[styles.rigaValore, { color: t.testoSecondario }]}>{valore}</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  annulla: { fontSize: 15, width: 70 },
  titoloBarra: { fontSize: 17, fontWeight: '800' },
  segnapostoBarra: { width: 70 },

  contenuto: { paddingHorizontal: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },

  etichetta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 16,
    marginBottom: 6,
  },
  senzaMargine: { marginTop: 0, marginBottom: 0 },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  campoTesto: { flex: 1, fontSize: 15 },
  campoInput: { fontSize: 15 },

  intestazioneVoci: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  linkAggiungi: { fontSize: 12, fontWeight: '800' },

  voce: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  voceTesta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  voceDescrizione: { flex: 1, fontSize: 14, fontWeight: '700' },
  cestino: { fontSize: 16 },
  voceAzioni: { flexDirection: 'row', gap: 14 },
  voceDettagli: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  voceMeta: { fontSize: 12 },
  voceTotale: { fontSize: 13, fontWeight: '800' },

  aggiungiTratteggiato: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  aggiungiTesto: { fontSize: 14, fontWeight: '700' },

  riepilogo: { borderTopWidth: 2, borderRadius: 12, padding: 12, marginTop: 16 },
  rigaTotale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  rigaEtichetta: { fontSize: 14 },
  rigaValore: { fontSize: 14 },
  separatore: { height: 1, marginVertical: 8 },
  totaleEtichetta: { fontSize: 18, fontWeight: '800' },
  totaleValore: { fontSize: 20, fontWeight: '800' },

  salva: { borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  salvaTesto: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  disabilitato: { opacity: 0.6 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
