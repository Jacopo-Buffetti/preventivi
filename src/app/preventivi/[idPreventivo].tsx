import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ORDINE_STATI, STATI } from '../../constants/stati';
import { useTema, type Tema } from '../../constants/tema';
import {
  deleteCliente,
  deletePreventivo,
  getPreventivoById,
  getVociByPreventivoId,
  updateStatoPreventivo,
  type PreventivoConCliente,
  type StatoPreventivo,
  type VocePreventivo,
} from '../../services/databaseService';
import {
  condividiPdfPreventivo,
  copiaConNome,
  generaPdfPreventivo,
} from '../../services/pdfService';
import { avviso, conferma } from '../../utils/dialoghi';
import {
  formattaData,
  formattaEuro,
  formattaNumeroPreventivo,
  nomeFilePreventivo,
} from '../../utils/formato';

export default function DettaglioPreventivoScreen() {
  const { idPreventivo } = useLocalSearchParams<{ idPreventivo: string }>();
  const router = useRouter();
  const t = useTema();
  const insets = useSafeAreaInsets();

  const [preventivo, setPreventivo] = useState<PreventivoConCliente | null>(
    null
  );
  const [voci, setVoci] = useState<VocePreventivo[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!idPreventivo) return;
      Promise.all([
        getPreventivoById(idPreventivo),
        getVociByPreventivoId(idPreventivo),
      ])
        .then(([p, v]) => {
          setPreventivo(p);
          setVoci(v);
        })
        .catch((err) => {
          console.error(err);
          avviso('Errore', 'Impossibile caricare il preventivo.');
        })
        .finally(() => setCaricamento(false));
    }, [idPreventivo])
  );

  // Se si arriva qui da un link diretto non c'è una pagina a cui tornare
  const tornaAllaLista = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/preventivi');
  };

  const cambiaStato = async (stato: StatoPreventivo) => {
    if (!preventivo || preventivo.stato === stato) return;
    const precedente = preventivo.stato;
    setPreventivo({ ...preventivo, stato }); // aggiornamento immediato a schermo
    try {
      await updateStatoPreventivo(preventivo.id, stato);
    } catch (err) {
      console.error(err);
      setPreventivo((p) => (p ? { ...p, stato: precedente } : p));
      avviso('Errore', 'Impossibile aggiornare lo stato.');
    }
  };

  const condividi = async () => {
    if (!preventivo) return;
    try {
      setGenerandoPdf(true);
      await condividiPdfPreventivo(preventivo.id);
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile generare il PDF del preventivo.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Salva il PDF in storage locale e apre la stampa
  const salvaEStampaPdf = async () => {
    if (!preventivo) return;
    try {
      setGenerandoPdf(true);
      const uri = await generaPdfPreventivo(preventivo.id);

      const filename = nomeFilePreventivo(
        preventivo.anno,
        preventivo.numero_preventivo
      );
      // Se la copia fallisce si stampa comunque il file generato
      let daStampare = uri;
      try {
        daStampare = await copiaConNome(
          uri,
          FileSystem.documentDirectory || FileSystem.cacheDirectory!,
          filename
        );
        avviso('Salvato', `PDF salvato in ${daStampare}`);
      } catch (copyErr) {
        console.warn(
          'Impossibile salvare il PDF in documentDirectory, uso percorso temporaneo',
          copyErr
        );
      }

      // Apri la UI di stampa sul file salvato (se disponibile)
      try {
        await Print.printAsync({ uri: daStampare });
      } catch (printErr) {
        console.error(printErr);
        avviso('Errore', 'Impossibile aprire la stampa.');
      }
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile generare il PDF del preventivo.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Condivide il PDF via WhatsApp: apre la chat del cliente con testo
  // e poi apre il foglio di condivisione per allegare il PDF (miglior fallback).
  const condividiWhatsApp = async () => {
    if (!preventivo) return;
    try {
      setGenerandoPdf(true);
      const uri = await generaPdfPreventivo(preventivo.id);

      const testo = `Ti invio il preventivo N° ${formattaNumeroPreventivo(
        preventivo.anno,
        preventivo.numero_preventivo
      )}`;

      // Preferisci usare `react-native-share` (richiede dev/custom build)
      // per aprire direttamente WhatsApp con allegato.
      try {
        let RNShare: any = null;
        if (Platform.OS !== 'web') {
          try {
            // require dinamico per evitare crash su web
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            RNShare = require('react-native-share');
          } catch (e) {
            RNShare = null;
          }
        }

        const options: any = {
          title: 'Preventivo',
          message: testo,
          url: uri,
          failOnCancel: false,
        };

        if (RNShare && RNShare.Social && RNShare.Social.WHATSAPP) {
          options.social = RNShare.Social.WHATSAPP;
        }

        if (RNShare && typeof RNShare.open === 'function') {
          await RNShare.open(options);
        } else {
          throw new Error('react-native-share not available');
        }
      } catch (shareErr) {
        console.warn(
          'react-native-share failed or not available, falling back to expo-sharing',
          shareErr
        );
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
        } else {
          // fallback: apri chat WhatsApp con testo (senza allegato) e mostra stampa
          const numero = (preventivo.cliente_telefono || '').replace(
            /[^0-9+]/g,
            ''
          );
          if (numero) {
            const phoneParam = numero.replace(/^\+/, '');
            const url = `https://wa.me/${phoneParam}?text=${encodeURIComponent(testo)}`;
            Linking.openURL(url).catch(console.error);
          } else {
            avviso(
              'Attenzione',
              'Numero WhatsApp del cliente non disponibile.'
            );
          }
          await Print.printAsync({ uri });
        }
      }
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile condividere via WhatsApp.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Condivide il PDF via email: apre il composer con allegato quando possibile
  const condividiEmail = async () => {
    if (!preventivo) return;
    try {
      setGenerandoPdf(true);
      const uri = await generaPdfPreventivo(preventivo.id);

      const destinatario = preventivo.cliente_email || '';
      const subject = `Preventivo ${formattaNumeroPreventivo(
        preventivo.anno,
        preventivo.numero_preventivo
      )}`;
      const body = `Ciao ${preventivo.cliente_nome ?? ''},\n\nIn allegato trovi il preventivo ${formattaNumeroPreventivo(
        preventivo.anno,
        preventivo.numero_preventivo
      )}.\n\nSaluti`;

      if (await MailComposer.isAvailableAsync()) {
        await MailComposer.composeAsync({
          recipients: destinatario ? [destinatario] : [],
          subject,
          body,
          attachments: [uri],
        });
      } else {
        // fallback: apri mailto senza allegato
        const mailto = `mailto:${encodeURIComponent(destinatario)}?subject=${encodeURIComponent(
          subject
        )}&body=${encodeURIComponent(body)}`;
        Linking.openURL(mailto).catch(console.error);
      }
    } catch (err) {
      console.error(err);
      avviso('Errore', "Impossibile inviare l'email.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const elimina = async () => {
    if (!preventivo) return;
    const numeroDaEliminare = formattaNumeroPreventivo(
      preventivo.anno,
      preventivo.numero_preventivo
    );
    const ok = await conferma(
      'Eliminare il preventivo?',
      `Il preventivo N° ${numeroDaEliminare} e tutte le sue voci verranno eliminati definitivamente.`,
      'Elimina',
      true
    );
    if (!ok) return;
    try {
      await deletePreventivo(preventivo.id);
      tornaAllaLista();
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile eliminare il preventivo.');
    }
  };

  const apri = (url: string) => Linking.openURL(url).catch(console.error);

  // --- Stati di caricamento e preventivo inesistente ---

  if (caricamento) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <ActivityIndicator color={t.accento} size="large" />
      </View>
    );
  }

  if (!preventivo) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <Text style={[styles.titoloVuoto, { color: t.testo }]}>
          Preventivo non trovato
        </Text>
        <Text style={[styles.testoVuoto, { color: t.testoSecondario }]}>
          Potrebbe essere stato eliminato.
        </Text>
        <Pressable
          onPress={() => router.replace('/preventivi')}
          style={[
            styles.bottoneSecondario,
            { borderColor: t.bordo, marginTop: 20 },
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.bottoneSecondarioTesto, { color: t.testo }]}>
            Torna ai preventivi
          </Text>
        </Pressable>
      </View>
    );
  }

  const numero = formattaNumeroPreventivo(
    preventivo.anno,
    preventivo.numero_preventivo
  );
  const stato = STATI[preventivo.stato] ?? STATI.bozza;

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      {/* Barra superiore */}
      <View style={[styles.barra, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={tornaAllaLista}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={[styles.indietro, { color: t.testoSecondario }]}>
            ‹ Preventivi
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/preventivi/nuovo',
              params: { idPreventivo: preventivo.id },
            })
          }
          style={({ pressed }) => [
            styles.pillModifica,
            { backgroundColor: t.card, borderColor: t.bordo },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Modifica preventivo"
        >
          <Text style={[styles.pillModificaTesto, { color: t.accento }]}>
            ✎ Modifica
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Testata con totale */}
        <View
          style={[
            styles.hero,
            { backgroundColor: t.card, borderColor: t.bordo },
          ]}
        >
          <View style={styles.heroTesta}>
            <Text style={[styles.numero, { color: t.testo }]}>N° {numero}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: stato.sfondo, borderColor: stato.colore },
              ]}
            >
              <Text style={[styles.badgeTesto, { color: stato.colore }]}>
                {stato.etichetta}
              </Text>
            </View>
          </View>
          <Text style={[styles.data, { color: t.testoSecondario }]}>
            Emesso il {formattaData(preventivo.data_creazione)}
          </Text>

          {!!preventivo.oggetto && (
            <Text style={[styles.oggetto, { color: t.testo }]}>
              {preventivo.oggetto}
            </Text>
          )}

          <View style={[styles.separatore, { backgroundColor: t.bordo }]} />
          <Text style={[styles.etichettaPiccola, { color: t.testoSecondario }]}>
            TOTALE IVA INCLUSA
          </Text>
          <Text style={[styles.totaleGrande, { color: t.accento }]}>
            {formattaEuro(preventivo.totale_generale)}
          </Text>
        </View>

        {/* Stato */}
        <Etichetta testo="STATO DEL PREVENTIVO" t={t} />
        <View style={styles.stati}>
          {ORDINE_STATI.map((s) => {
            const info = STATI[s];
            const attivo = preventivo.stato === s;
            return (
              <Pressable
                key={s}
                onPress={() => cambiaStato(s)}
                style={[
                  styles.chipStato,
                  {
                    borderColor: attivo ? info.colore : t.bordo,
                    backgroundColor: attivo ? info.sfondo : t.card,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: attivo }}
              >
                <Text
                  style={[
                    styles.chipStatoTesto,
                    { color: attivo ? info.colore : t.testoSecondario },
                  ]}
                >
                  {info.etichetta}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Cliente */}
        <Etichetta testo="CLIENTE" t={t} />
        <View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.bordo },
          ]}
        >
          <Text style={[styles.clienteNome, { color: t.testo }]}>
            👤 {preventivo.cliente_nome ?? 'Cliente non trovato'}
          </Text>
          {!!preventivo.cliente_indirizzo && (
            <Text
              style={[styles.clienteDettaglio, { color: t.testoSecondario }]}
            >
              📍 {preventivo.cliente_indirizzo}
            </Text>
          )}

          {(!!preventivo.cliente_telefono || !!preventivo.cliente_email) && (
            <View style={styles.contatti}>
              {!!preventivo.cliente_telefono && (
                <Pressable
                  onPress={() =>
                    apri(
                      `tel:${preventivo.cliente_telefono!.replace(/\s/g, '')}`
                    )
                  }
                  style={[
                    styles.contatto,
                    { backgroundColor: t.bottoneSecondario },
                  ]}
                  accessibilityRole="link"
                >
                  <Text style={[styles.contattoTesto, { color: t.testo }]}>
                    📞 Chiama
                  </Text>
                </Pressable>
              )}
              {!!preventivo.cliente_email && (
                <Pressable
                  onPress={() => apri(`mailto:${preventivo.cliente_email}`)}
                  style={[
                    styles.contatto,
                    { backgroundColor: t.bottoneSecondario },
                  ]}
                  accessibilityRole="link"
                >
                  <Text style={[styles.contattoTesto, { color: t.testo }]}>
                    ✉️ Email
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          {/* Seconda riga: solo le azioni sul contatto */}
          {!!preventivo.cliente_id && (
            <View style={styles.contatti}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/clienti/nuovo',
                    params: { idCliente: preventivo.cliente_id },
                  })
                }
                style={[
                  styles.contatto,
                  { backgroundColor: t.bottoneSecondario },
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.contattoTesto, { color: t.testo }]}>
                  ✏️ Modifica contatto
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!preventivo.cliente_id) return;
                  const ok = await conferma(
                    'Eliminare il contatto?',
                    'Il cliente verrà eliminato definitivamente.',
                    'Elimina',
                    true
                  );
                  if (!ok) return;
                  try {
                    await deleteCliente(preventivo.cliente_id);
                    setPreventivo((p) =>
                      p
                        ? {
                            ...p,
                            cliente_id: '',
                            cliente_nome: undefined,
                            cliente_indirizzo: undefined,
                            cliente_email: undefined,
                            cliente_telefono: undefined,
                          }
                        : p
                    );
                  } catch (err) {
                    console.error(err);
                    avviso('Errore', 'Impossibile eliminare il cliente.');
                  }
                }}
                style={[
                  styles.contatto,
                  { backgroundColor: t.bottoneSecondario },
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.contattoTesto, { color: t.pericolo }]}>
                  🗑️ Elimina contatto
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Voci */}
        <Etichetta testo={`VOCI DI COSTO (${voci.length})`} t={t} />
        <View
          style={[
            styles.card,
            styles.cardVoci,
            { backgroundColor: t.card, borderColor: t.bordo },
          ]}
        >
          {voci.map((v, i) => (
            <View
              key={v.id}
              style={[
                styles.voce,
                i < voci.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: t.bordo,
                },
              ]}
            >
              <Text style={[styles.voceDescrizione, { color: t.testo }]}>
                {v.descrizione}
              </Text>
              <View style={styles.voceDettagli}>
                <Text style={[styles.voceMeta, { color: t.testoSecondario }]}>
                  {v.quantita.toLocaleString('it-IT')} ×{' '}
                  {formattaEuro(v.prezzo_unitario)}
                </Text>
                <Text style={[styles.voceTotale, { color: t.testo }]}>
                  {formattaEuro(v.totale_voce)}
                </Text>
              </View>
            </View>
          ))}
          {voci.length === 0 && (
            <Text
              style={[
                styles.voceMeta,
                styles.nessunaVoce,
                { color: t.testoSecondario },
              ]}
            >
              Nessuna voce in questo preventivo.
            </Text>
          )}
        </View>

        {/* Riepilogo */}
        <View
          style={[
            styles.riepilogo,
            { backgroundColor: t.card, borderTopColor: t.accento },
          ]}
        >
          <RigaTotale
            etichetta="Imponibile"
            valore={formattaEuro(preventivo.totale_imponibile)}
            t={t}
          />
          <RigaTotale
            etichetta={`IVA (${preventivo.aliquota_iva}%)`}
            valore={formattaEuro(preventivo.totale_iva)}
            t={t}
          />
          <View style={[styles.separatore, { backgroundColor: t.bordo }]} />
          <View style={styles.rigaTotale}>
            <Text style={[styles.totaleEtichetta, { color: t.testo }]}>
              TOTALE
            </Text>
            <Text style={[styles.totaleValore, { color: t.accento }]}>
              {formattaEuro(preventivo.totale_generale)}
            </Text>
          </View>
        </View>

        {/* Note */}
        {!!preventivo.note_pagamento && (
          <>
            <Etichetta testo="NOTE" t={t} />
            <View
              style={[
                styles.card,
                { backgroundColor: t.card, borderColor: t.bordo },
              ]}
            >
              <Text style={[styles.note, { color: t.testoSecondario }]}>
                {preventivo.note_pagamento}
              </Text>
            </View>
          </>
        )}

        {/* Azioni */}
        <Pressable
          onPress={salvaEStampaPdf}
          disabled={generandoPdf}
          style={({ pressed }) => [
            styles.bottonePrimario,
            { backgroundColor: t.bottonePrimario },
            generandoPdf && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          {generandoPdf ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.bottonePrimarioTesto}>🖨️ Stampa PDF</Text>
          )}
        </Pressable>

        <Pressable
          onPress={condividiWhatsApp}
          disabled={generandoPdf}
          style={({ pressed }) => [
            styles.bottoneSecondario,
            { borderColor: t.bordo, marginTop: 12 },
            generandoPdf && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.bottoneSecondarioTesto, { color: t.testo }]}>
            💬 Condividi preventivo (WhatsApp)
          </Text>
        </Pressable>

        <Pressable
          onPress={condividiEmail}
          disabled={generandoPdf}
          style={({ pressed }) => [
            styles.bottoneSecondario,
            { borderColor: t.bordo, marginTop: 12 },
            generandoPdf && styles.disabilitato,
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.bottoneSecondarioTesto, { color: t.testo }]}>
            ✉️ Condividi PDF (Email)
          </Text>
        </Pressable>

        <Pressable
          onPress={elimina}
          style={({ pressed }) => [
            styles.bottoneSecondario,
            { borderColor: t.pericolo },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.bottoneSecondarioTesto, { color: t.pericolo }]}>
            🗑️ Elimina preventivo
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Etichetta({ testo, t }: { testo: string; t: Tema }) {
  return (
    <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
      {testo}
    </Text>
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
      <Text style={[styles.rigaTesto, { color: t.testoSecondario }]}>
        {valore}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titoloVuoto: { fontSize: 18, fontWeight: '800' },
  testoVuoto: { fontSize: 14, marginTop: 6 },

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
  indietro: { fontSize: 15, fontWeight: '600' },
  pillModifica: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillModificaTesto: { fontSize: 14, fontWeight: '700' },

  contenuto: {
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  hero: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 4 },
  heroTesta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  numero: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTesto: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  data: { fontSize: 13, marginTop: 2 },
  oggetto: { fontSize: 16, fontWeight: '700', marginTop: 14, lineHeight: 22 },
  separatore: { height: 1, marginVertical: 12 },
  etichettaPiccola: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  totaleGrande: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },

  etichetta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 22,
    marginBottom: 8,
  },

  stati: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipStato: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipStatoTesto: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },

  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  cardVoci: { paddingVertical: 4 },
  clienteNome: { fontSize: 16, fontWeight: '700' },
  clienteDettaglio: { fontSize: 14, marginTop: 6 },
  contatti: { flexDirection: 'row', gap: 8, marginTop: 12 },
  contatto: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contattoTesto: { fontSize: 13, fontWeight: '700' },

  voce: { paddingVertical: 12 },
  voceDescrizione: { fontSize: 14, fontWeight: '700' },
  voceDettagli: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  voceMeta: { fontSize: 13 },
  voceTotale: { fontSize: 14, fontWeight: '800' },
  nessunaVoce: { paddingVertical: 12 },

  riepilogo: {
    borderTopWidth: 2,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  rigaTotale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  rigaTesto: { fontSize: 14 },
  totaleEtichetta: { fontSize: 18, fontWeight: '800' },
  totaleValore: { fontSize: 20, fontWeight: '800' },

  note: { fontSize: 14, lineHeight: 20 },

  bottonePrimario: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  bottonePrimarioTesto: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  bottoneSecondario: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  bottoneSecondarioTesto: { fontSize: 15, fontWeight: '700' },

  disabilitato: { opacity: 0.6 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
