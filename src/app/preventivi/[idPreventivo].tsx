import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import {
  coloriStato,
  ETICHETTE_STATO,
  ORDINE_STATI,
} from '../../constants/stati';
import { FONT, useSceltaTema, useTema, type Tema } from '../../constants/tema';
import {
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
import { prontoPerInvio } from '../../utils/invioPreventivo';
import {
  formattaData,
  formattaEuro,
  formattaNumeroPreventivo,
  nomeFilePreventivo,
  numeroWhatsApp,
} from '../../utils/formato';

export default function DettaglioPreventivoScreen() {
  const { idPreventivo } = useLocalSearchParams<{ idPreventivo: string }>();
  const router = useRouter();
  const t = useTema();
  const { nome: nomeTema } = useSceltaTema();
  const insets = useSafeAreaInsets();

  // Intestazione blu notte: mentre la schermata è visibile, ora e batteria
  // del telefono vanno in chiaro
  const [inVista, setInVista] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setInVista(true);
      return () => setInVista(false);
    }, [])
  );

  const [preventivo, setPreventivo] = useState<PreventivoConCliente | null>(
    null
  );
  const [voci, setVoci] = useState<VocePreventivo[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useCaricaQuandoVisibile(() => {
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
  });

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

  // Da chiamare prima di ogni invio (condivisione, WhatsApp, email, stampa):
  // se è una bozza le fa assegnare il numero dal server (vedi invioPreventivo.ts)
  // e aggiorna subito la schermata con numero e stato nuovi.
  const preparaInvio = async (): Promise<PreventivoConCliente | null> => {
    if (!preventivo) return null;
    const pronto = await prontoPerInvio(preventivo);
    if (pronto && pronto !== preventivo) setPreventivo(pronto);
    return pronto;
  };

  const condividi = async () => {
    if (!preventivo) return;
    try {
      setGenerandoPdf(true);
      const p = await preparaInvio();
      if (!p) return;
      await condividiPdfPreventivo(p.id);
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
      const p = await preparaInvio();
      if (!p) return;
      const uri = await generaPdfPreventivo(p.id);

      const filename = nomeFilePreventivo(p.anno, p.numero_preventivo);
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
      const p = await preparaInvio();
      if (!p) return;
      const uri = await generaPdfPreventivo(p.id);

      const testo = `Ti invio il preventivo N° ${formattaNumeroPreventivo(
        p.anno,
        p.numero_preventivo
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
          const numero = numeroWhatsApp(preventivo.cliente_telefono || '');
          if (numero) {
            const url = `https://wa.me/${numero}?text=${encodeURIComponent(testo)}`;
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
      const p = await preparaInvio();
      if (!p) return;
      const uri = await generaPdfPreventivo(p.id);

      const destinatario = p.cliente_email || '';
      const subject = `Preventivo ${formattaNumeroPreventivo(p.anno, p.numero_preventivo)}`;
      const body = `Ciao ${p.cliente_nome ?? ''},\n\nIn allegato trovi il preventivo ${formattaNumeroPreventivo(
        p.anno,
        p.numero_preventivo
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
        <ActivityIndicator color={t.ottone} size="large" />
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
          Potrebbe essere stato eliminato su questo o su un altro dispositivo.
        </Text>
        <Pressable
          onPress={() => router.replace('/preventivi')}
          style={({ pressed }) => [
            styles.pulsanteContorno,
            { borderColor: t.bordo, marginTop: 20, paddingHorizontal: 20 },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.pulsanteContornoTesto, { color: t.testo }]}>
            Torna ai preventivi
          </Text>
        </Pressable>
      </View>
    );
  }

  const bozza = preventivo.numero_preventivo === null;
  const etichettaNumero = bozza
    ? 'Bozza, il numero arriva al primo invio'
    : `Preventivo N. ${formattaNumeroPreventivo(preventivo.anno, preventivo.numero_preventivo)}`;
  const telefono = (preventivo.cliente_telefono ?? '').replace(/[^0-9+]/g, '');
  // Con il prefisso internazionale, se manca: wa.me non funziona senza
  const telefonoWhatsApp = numeroWhatsApp(telefono);

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      {inVista && <StatusBar style="light" />}

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* --- INTESTAZIONE: numero, oggetto, totale, stato --- */}
        <View
          style={[
            styles.intestazione,
            { backgroundColor: t.intestazione, paddingTop: insets.top + 8 },
          ]}
        >
          <View style={styles.barra}>
            <Pressable
              onPress={tornaAllaLista}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.indietro}
            >
              <Feather
                name="chevron-left"
                size={22}
                color={t.testoIntestazioneSecondario}
              />
              <Text
                style={[
                  styles.indietroTesto,
                  { color: t.testoIntestazioneSecondario },
                ]}
              >
                Preventivi
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/preventivi/nuovo',
                  params: { idPreventivo: preventivo.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Modifica preventivo"
              style={({ pressed }) => [
                styles.pulsanteIcona,
                { backgroundColor: t.riquadroIntestazione },
                pressed && styles.premuto,
              ]}
            >
              <Feather name="edit-3" size={20} color={t.testoIntestazione} />
            </Pressable>
          </View>

          <View style={styles.titoli}>
            <Text style={[styles.numero, { color: t.bottonePrimario }]}>
              {etichettaNumero}
            </Text>
            <Text style={[styles.oggetto, { color: t.testoIntestazione }]}>
              {preventivo.oggetto?.trim() || 'Preventivo'}
            </Text>
            <Text
              style={[styles.data, { color: t.testoIntestazioneSecondario }]}
            >
              Emesso il {formattaData(preventivo.data_creazione)}
            </Text>
          </View>

          <View style={styles.blocco}>
            <Text
              style={[styles.data, { color: t.testoIntestazioneSecondario }]}
            >
              Totale con IVA
            </Text>
            <Text style={[styles.totaleGrande, { color: t.testoIntestazione }]}>
              {formattaEuro(preventivo.totale_generale)}
            </Text>
          </View>

          {/* Selettore dello stato, a quattro posizioni */}
          <View
            style={[
              styles.selettore,
              { backgroundColor: t.riquadroIntestazione },
            ]}
            accessibilityRole="radiogroup"
            accessibilityLabel="Stato del preventivo"
          >
            {ORDINE_STATI.map((s) => {
              const attivo = preventivo.stato === s;
              const colori = coloriStato(s, 'light');
              return (
                <Pressable
                  key={s}
                  onPress={() => cambiaStato(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: attivo }}
                  style={[
                    styles.opzioneStato,
                    attivo && {
                      backgroundColor:
                        nomeTema === 'dark' ? '#1F3650' : '#FFFFFF',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.opzioneStatoTesto,
                      {
                        color: attivo
                          ? nomeTema === 'dark'
                            ? coloriStato(s, 'dark').colore
                            : colori.colore
                          : t.testoIntestazioneSecondario,
                        fontFamily: attivo ? FONT.pieno : FONT.semi,
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {ETICHETTE_STATO[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.corpo}>
          {/* --- CLIENTE --- */}
          <Sezione
            t={t}
            titolo="Cliente"
            azione={
              preventivo.cliente_id
                ? {
                    etichetta: 'Modifica contatto',
                    onPress: () =>
                      router.push({
                        pathname: '/clienti/nuovo',
                        params: { idCliente: preventivo.cliente_id },
                      }),
                  }
                : undefined
            }
          >
            <View
              style={[
                styles.card,
                styles.cardCliente,
                { backgroundColor: t.card, borderColor: t.bordo },
              ]}
            >
              <View style={{ gap: 3 }}>
                <Text style={[styles.clienteNome, { color: t.testo }]}>
                  {preventivo.cliente_nome ?? 'Cliente non trovato'}
                </Text>
                {!!preventivo.cliente_indirizzo && (
                  <Text
                    style={[styles.sottoRiga, { color: t.testoSecondario }]}
                  >
                    {preventivo.cliente_indirizzo}
                  </Text>
                )}
              </View>

              {(!!telefono || !!preventivo.cliente_email) && (
                <View style={styles.contatti}>
                  {!!telefono && (
                    <PulsanteContatto
                      t={t}
                      icona="phone"
                      testo="Chiama"
                      onPress={() => apri(`tel:${telefono}`)}
                    />
                  )}
                  {!!telefonoWhatsApp && (
                    <PulsanteContatto
                      t={t}
                      icona="message-circle"
                      testo="Messaggio"
                      onPress={() => apri(`https://wa.me/${telefonoWhatsApp}`)}
                    />
                  )}
                  {!!preventivo.cliente_email && (
                    <PulsanteContatto
                      t={t}
                      icona="mail"
                      testo="Email"
                      onPress={() => apri(`mailto:${preventivo.cliente_email}`)}
                    />
                  )}
                </View>
              )}
            </View>
          </Sezione>

          {/* --- VOCI E TOTALI --- */}
          <Sezione t={t} titolo="Lavori e materiali">
            <View
              style={[
                styles.card,
                { backgroundColor: t.card, borderColor: t.bordo },
              ]}
            >
              {voci.map((v) => (
                <View
                  key={v.id}
                  style={[
                    styles.voce,
                    { borderBottomWidth: 1, borderBottomColor: t.bordo },
                  ]}
                >
                  <View style={styles.voceTesti}>
                    <Text style={[styles.voceDescrizione, { color: t.testo }]}>
                      {v.descrizione}
                    </Text>
                    <Text
                      style={[
                        styles.sottoRiga,
                        styles.cifre,
                        { color: t.testoSecondario },
                      ]}
                    >
                      {v.quantita.toLocaleString('it-IT')} ×{' '}
                      {formattaEuro(v.prezzo_unitario)}
                    </Text>
                  </View>
                  <Text style={[styles.voceTotale, { color: t.testo }]}>
                    {formattaEuro(v.totale_voce)}
                  </Text>
                </View>
              ))}
              {voci.length === 0 && (
                <Text
                  style={[
                    styles.sottoRiga,
                    styles.nessunaVoce,
                    { color: t.testoSecondario, borderBottomColor: t.bordo },
                  ]}
                >
                  Nessuna voce: tocca la matita in alto per aggiungerne.
                </Text>
              )}

              <View style={[styles.totali, { backgroundColor: t.riquadro }]}>
                <RigaTotale
                  t={t}
                  etichetta="Imponibile"
                  valore={formattaEuro(preventivo.totale_imponibile)}
                />
                <RigaTotale
                  t={t}
                  etichetta={`IVA ${preventivo.aliquota_iva}%`}
                  valore={formattaEuro(preventivo.totale_iva)}
                />
                <View
                  style={[
                    styles.rigaTotale,
                    styles.rigaTotaleFinale,
                    { borderTopColor: t.bordo },
                  ]}
                >
                  <Text style={[styles.totaleEtichetta, { color: t.testo }]}>
                    Totale
                  </Text>
                  <Text
                    style={[
                      styles.totaleEtichetta,
                      styles.cifre,
                      { color: t.testo },
                    ]}
                  >
                    {formattaEuro(preventivo.totale_generale)}
                  </Text>
                </View>
              </View>
            </View>
          </Sezione>

          {/* --- NOTE / PAGAMENTO --- */}
          {!!preventivo.note_pagamento && (
            <Sezione t={t} titolo="Note e pagamento">
              <View
                style={[
                  styles.card,
                  styles.cardNote,
                  { backgroundColor: t.card, borderColor: t.bordo },
                ]}
              >
                <Text style={[styles.note, { color: t.testo }]}>
                  {preventivo.note_pagamento}
                </Text>
              </View>
            </Sezione>
          )}

          <Pressable
            onPress={elimina}
            accessibilityRole="button"
            style={({ pressed }) => [styles.elimina, pressed && styles.premuto]}
          >
            <Text style={[styles.eliminaTesto, { color: t.pericolo }]}>
              Elimina preventivo
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* --- BARRA DELLE AZIONI, sempre visibile in basso --- */}
      <View
        style={[
          styles.barraAzioni,
          { backgroundColor: t.barraTab, borderTopColor: t.bordo },
        ]}
      >
        <Pressable
          onPress={condividiWhatsApp}
          disabled={generandoPdf}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.azionePrincipale,
            { backgroundColor: t.bottonePrimario },
            generandoPdf && styles.disabilitato,
            pressed && styles.premuto,
          ]}
        >
          {generandoPdf ? (
            <ActivityIndicator color={t.testoSuPrimario} />
          ) : (
            <>
              <Feather
                name="message-circle"
                size={20}
                color={t.testoSuPrimario}
              />
              <Text
                style={[
                  styles.azionePrincipaleTesto,
                  { color: t.testoSuPrimario },
                ]}
              >
                Invia su WhatsApp
              </Text>
            </>
          )}
        </Pressable>
        <View style={styles.azioniSecondarie}>
          <AzioneSecondaria
            t={t}
            icona="mail"
            testo="Email"
            onPress={condividiEmail}
            disabilitata={generandoPdf}
          />
          <AzioneSecondaria
            t={t}
            icona="printer"
            testo="PDF e stampa"
            onPress={salvaEStampaPdf}
            disabilitata={generandoPdf}
          />
        </View>
      </View>
    </View>
  );
}

// --- COMPONENTI ---------------------------------------------------------------

type NomeIcona = ComponentProps<typeof Feather>['name'];

function Sezione({
  t,
  titolo,
  azione,
  children,
}: {
  t: Tema;
  titolo: string;
  azione?: { etichetta: string; onPress: () => void };
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
        {azione && (
          <Pressable
            onPress={azione.onPress}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={[styles.linkSezione, { color: t.accento }]}>
              {azione.etichetta}
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function PulsanteContatto({
  t,
  icona,
  testo,
  onPress,
}: {
  t: Tema;
  icona: NomeIcona;
  testo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [
        styles.contatto,
        { backgroundColor: t.riquadro },
        pressed && styles.premuto,
      ]}
    >
      <Feather name={icona} size={17} color={t.testo} />
      <Text style={[styles.contattoTesto, { color: t.testo }]}>{testo}</Text>
    </Pressable>
  );
}

function AzioneSecondaria({
  t,
  icona,
  testo,
  onPress,
  disabilitata,
}: {
  t: Tema;
  icona: NomeIcona;
  testo: string;
  onPress: () => void;
  disabilitata: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitata}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.azioneSecondaria,
        { borderColor: t.bordo },
        disabilitata && styles.disabilitato,
        pressed && styles.premuto,
      ]}
    >
      <Feather name={icona} size={18} color={t.testo} />
      <Text style={[styles.azioneSecondariaTesto, { color: t.testo }]}>
        {testo}
      </Text>
    </Pressable>
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

// --- STILI ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titoloVuoto: { fontSize: 20, fontFamily: FONT.pieno, textAlign: 'center' },
  testoVuoto: {
    fontSize: 14,
    fontFamily: FONT.regolare,
    textAlign: 'center',
    marginTop: 6,
  },

  intestazione: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indietro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 44,
    paddingRight: 8,
  },
  indietroTesto: { fontSize: 15, fontFamily: FONT.semi },
  pulsanteIcona: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titoli: { gap: 6 },
  numero: {
    fontSize: 14,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  oggetto: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  data: { fontSize: 14, fontFamily: FONT.regolare },
  blocco: { gap: 4 },
  totaleGrande: {
    fontSize: 38,
    lineHeight: 44,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },

  selettore: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14 },
  opzioneStato: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  opzioneStatoTesto: { fontSize: 12 },

  corpo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  sezione: { gap: 10 },
  testaSezione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titoloSezione: { fontSize: 16, fontFamily: FONT.pieno },
  linkSezione: { fontSize: 14, fontFamily: FONT.grassetto, paddingVertical: 4 },

  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  cardCliente: { padding: 16, gap: 14 },
  cardNote: { padding: 16 },
  clienteNome: { fontSize: 17, fontFamily: FONT.grassetto },
  sottoRiga: { fontSize: 13, fontFamily: FONT.regolare },
  contatti: { flexDirection: 'row', gap: 8 },
  contatto: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  contattoTesto: { fontSize: 13, fontFamily: FONT.grassetto },

  voce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  voceTesti: { flex: 1, gap: 3 },
  voceDescrizione: { fontSize: 15, fontFamily: FONT.grassetto },
  voceTotale: {
    fontSize: 15,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  nessunaVoce: { padding: 16, borderBottomWidth: 1 },
  cifre: { fontVariant: ['tabular-nums'] },

  totali: { paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  rigaTotale: { flexDirection: 'row', justifyContent: 'space-between' },
  rigaTesto: { fontSize: 14, fontFamily: FONT.regolare },
  rigaTotaleFinale: { borderTopWidth: 1, paddingTop: 10, marginTop: 2 },
  totaleEtichetta: { fontSize: 17, fontFamily: FONT.pieno },

  note: { fontSize: 14, lineHeight: 21, fontFamily: FONT.regolare },

  elimina: {
    alignSelf: 'center',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  eliminaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  pulsanteContorno: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  pulsanteContornoTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  barraAzioni: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  azionePrincipale: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  azionePrincipaleTesto: { fontSize: 16, fontFamily: FONT.pieno },
  azioniSecondarie: { flexDirection: 'row', gap: 10 },
  azioneSecondaria: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  azioneSecondariaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  disabilitato: { opacity: 0.6 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
