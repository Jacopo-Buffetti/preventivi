import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
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
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TurboModuleRegistry,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CopiaFirmata } from '../../components/preventivi/CopiaFirmata';
import { VisualizzatoreDocumento } from '../../components/ui/VisualizzatoreDocumento';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import {
  coloriStato,
  ETICHETTE_STATO,
  ORDINE_STATI,
} from '../../constants/stati';
import { FONT, useSceltaTema, useTema, type Tema } from '../../constants/tema';
import {
  etichettaTotaleConIva,
  etichettaTotaleFinale,
} from '../../constants/fisco';
import { quantitaConUnita } from '../../constants/unita';
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
  documentoDaInviare,
  stampaDocumento,
  type DocumentoPreventivo,
} from '../../services/documentoPreventivo';
import { apriConAppEsterna } from '../../services/apriDocumento';
import { copiaConNome, generaPdfPreventivo } from '../../services/pdfService';
import { avviso, conferma } from '../../utils/dialoghi';
import { prontoPerInvio } from '../../utils/invioPreventivo';
import {
  formattaData,
  formattaEuro,
  formattaNumeroPreventivo,
  formattaPercentuale,
  nomeFilePreventivo,
  numeroWhatsApp,
  percentualeSconto,
} from '../../utils/formato';
import { styles } from '../../styles/preventivi/dettaglio.styles';

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
  // PDF aperto nel visualizzatore interno (solo iPhone)
  const [pdfAperto, setPdfAperto] = useState<DocumentoPreventivo | null>(null);

  const carica = () => {
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
  };

  useCaricaQuandoVisibile(carica);

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

  // Mostra il PDF del preventivo, così come lo riceve il cliente.
  // Solo per guardarlo: non assegna il numero a una bozza (che esce con
  // "Bozza" al posto del numero) e non cambia lo stato.
  // Android: si apre con il lettore PDF del telefono; iPhone: dentro l'app.
  const vediPdf = async () => {
    if (!preventivo) return;
    try {
      setGenerandoPdf(true);
      const doc: DocumentoPreventivo = {
        uri: await generaPdfPreventivo(preventivo.id),
        mimeType: 'application/pdf',
        nomeFile: nomeFilePreventivo(
          preventivo.anno,
          preventivo.numero_preventivo
        ),
        firmato: false,
      };
      if (Platform.OS === 'android') await apriConAppEsterna(doc);
      else setPdfAperto(doc);
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile generare il PDF del preventivo.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Messaggio d'errore quando il documento non si riesce a preparare.
  // Con la copia firmata il caso tipico è un altro dispositivo offline:
  // il file sta sul server e qui non è ancora stato scaricato.
  const erroreDocumento = (p: PreventivoConCliente | null) =>
    p?.firmato_file
      ? avviso(
          'Copia firmata non disponibile',
          'Serve la connessione per scaricare la copia firmata da inviare.'
        )
      : avviso('Errore', 'Impossibile generare il PDF del preventivo.');

  // Salva il documento in storage locale e apre la stampa.
  // Con la copia firmata si salva e si stampa quella (vedi documentoPreventivo.ts)
  const salvaEStampaPdf = async () => {
    if (!preventivo) return;
    let p: PreventivoConCliente | null = null;
    try {
      setGenerandoPdf(true);
      p = await preparaInvio();
      if (!p) return;
      const doc = await documentoDaInviare(p);

      // Se la copia fallisce si stampa comunque il file preparato
      let daStampare = doc;
      try {
        const salvato = await copiaConNome(
          doc.uri,
          FileSystem.documentDirectory || FileSystem.cacheDirectory!,
          doc.nomeFile
        );
        daStampare = { ...doc, uri: salvato };
        avviso('Salvato', `File salvato in ${salvato}`);
      } catch (copyErr) {
        console.warn(
          'Impossibile salvare il file in documentDirectory, uso percorso temporaneo',
          copyErr
        );
      }

      // Apri la UI di stampa sul file salvato (se disponibile)
      try {
        await stampaDocumento(daStampare);
      } catch (printErr) {
        console.error(printErr);
        avviso('Errore', 'Impossibile aprire la stampa.');
      }
    } catch (err) {
      console.error(err);
      erroreDocumento(p);
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Condivide il documento via WhatsApp: apre la chat del cliente con testo
  // e poi apre il foglio di condivisione per allegarlo (miglior fallback).
  // Con la copia firmata si manda quella al posto del PDF generato.
  const condividiWhatsApp = async () => {
    if (!preventivo) return;
    let p: PreventivoConCliente | null = null;
    try {
      setGenerandoPdf(true);
      p = await preparaInvio();
      if (!p) return;
      const doc = await documentoDaInviare(p);
      const uri = doc.uri;

      const testo = `Ti invio il preventivo N° ${formattaNumeroPreventivo(
        p.anno,
        p.numero_preventivo
      )}${doc.firmato ? ' firmato' : ''}`;

      // Preferisci usare `react-native-share` (richiede dev/custom build)
      // per aprire direttamente WhatsApp con allegato.
      try {
        let RNShare: any = null;
        // Si carica solo se il modulo nativo c'è davvero: in Expo Go non
        // c'è (react-native-share non è incluso) e il require scriverebbe
        // un errore rosso nella console anche se poi lo gestiamo.
        // Nell'app installata invece c'è, e WhatsApp si apre direttamente.
        if (Platform.OS !== 'web' && shareNativoDisponibile()) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            RNShare = require('react-native-share');
          } catch {
            RNShare = null;
          }
        }

        const options: any = {
          title: 'Preventivo',
          message: testo,
          url: uri,
          type: doc.mimeType,
          filename: doc.nomeFile,
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
          await Sharing.shareAsync(uri, { mimeType: doc.mimeType });
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
          await stampaDocumento(doc);
        }
      }
    } catch (err) {
      console.error(err);
      if (p?.firmato_file) erroreDocumento(p);
      else avviso('Errore', 'Impossibile condividere via WhatsApp.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  // Condivide il documento via email: apre il composer con allegato quando
  // possibile. Con la copia firmata si allega quella al posto del PDF generato.
  const condividiEmail = async () => {
    if (!preventivo) return;
    let p: PreventivoConCliente | null = null;
    try {
      setGenerandoPdf(true);
      p = await preparaInvio();
      if (!p) return;
      const doc = await documentoDaInviare(p);
      const uri = doc.uri;

      const numero = formattaNumeroPreventivo(p.anno, p.numero_preventivo);
      const firmato = doc.firmato ? ' firmato' : '';
      const destinatario = p.cliente_email || '';
      const subject = `Preventivo ${numero}${firmato}`;
      const body = `Ciao ${p.cliente_nome ?? ''},\n\nIn allegato trovi il preventivo ${numero}${firmato}.\n\nSaluti`;

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
      if (p?.firmato_file) erroreDocumento(p);
      else avviso('Errore', "Impossibile inviare l'email.");
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
              {etichettaTotaleFinale(
                preventivo.aliquota_iva,
                preventivo.sconto,
                preventivo.marca_bollo ?? 0
              )}
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
                      {quantitaConUnita(v.quantita, v.unita)} ×{' '}
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
                  etichetta={
                    preventivo.aliquota_iva > 0
                      ? `IVA ${preventivo.aliquota_iva}%`
                      : 'IVA'
                  }
                  valore={
                    preventivo.aliquota_iva > 0
                      ? formattaEuro(preventivo.totale_iva)
                      : 'non soggetta'
                  }
                />
                {preventivo.sconto > 0 && (
                  <>
                    {/* Senza IVA sarebbe uguale all'imponibile: si salta */}
                    {preventivo.aliquota_iva > 0 && (
                      <RigaTotale
                        t={t}
                        etichetta={etichettaTotaleConIva(
                          preventivo.aliquota_iva
                        )}
                        valore={formattaEuro(
                          preventivo.totale_imponibile + preventivo.totale_iva
                        )}
                      />
                    )}
                    <RigaTotale
                      t={t}
                      etichetta={`Sconto arrotondamento (${formattaPercentuale(
                        percentualeSconto(
                          preventivo.sconto,
                          preventivo.totale_imponibile + preventivo.totale_iva
                        )
                      )})`}
                      valore={`− ${formattaEuro(preventivo.sconto)}`}
                    />
                  </>
                )}
                {(preventivo.marca_bollo ?? 0) > 0 && (
                  <RigaTotale
                    t={t}
                    etichetta="Marca da bollo"
                    valore={formattaEuro(preventivo.marca_bollo)}
                  />
                )}
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

          {/* --- COPIA FIRMATA: solo per i preventivi già inviati --- */}
          {!bozza && (
            <Sezione t={t} titolo="Copia firmata">
              <CopiaFirmata preventivo={preventivo} onCambiato={carica} />
            </Sezione>
          )}

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
        {/* Con la copia firmata, i pulsanti mandano quella */}
        {!!preventivo.firmato_file && (
          <View style={styles.notaFirmato}>
            <Feather name="check-circle" size={14} color={t.successo} />
            <Text
              style={[styles.notaFirmatoTesto, { color: t.testoSecondario }]}
            >
              Invii e stampi la copia firmata dal cliente
            </Text>
          </View>
        )}
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
            icona="eye"
            testo="Vedi PDF"
            onPress={vediPdf}
            disabilitata={generandoPdf}
          />
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
            testo="Stampa"
            onPress={salvaEStampaPdf}
            disabilitata={generandoPdf}
          />
        </View>
      </View>

      <VisualizzatoreDocumento
        documento={pdfAperto}
        onChiudi={() => setPdfAperto(null)}
      />
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

// react-native-share è un modulo nativo: c'è nell'app installata, non in
// Expo Go. TurboModuleRegistry.get (a differenza di getEnforcing, usato
// dalla libreria) restituisce null invece di lanciare un errore.
function shareNativoDisponibile(): boolean {
  return (
    TurboModuleRegistry.get('RNShare') != null || NativeModules.RNShare != null
  );
}
