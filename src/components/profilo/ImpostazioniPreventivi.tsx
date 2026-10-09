import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import {
  ALIQUOTE_IVA,
  ALIQUOTA_IVA_PREDEFINITA,
  IMPORTO_MARCA_BOLLO,
} from '../../constants/fisco';
import { useTema } from '../../constants/tema';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import {
  aggiornaImpostazioniPreventivi,
  getImpostazioniPreventivi,
  type ImpostazioniPreventivi as Impostazioni,
} from '../../services/databaseService';
import { avviso } from '../../utils/dialoghi';
import { formattaEuro } from '../../utils/formato';
import { Chip } from '../ui/Chip';
import { styles } from './ImpostazioniPreventivi.styles';

// Aliquota IVA e marca da bollo dei preventivi, nel Profilo.
// Si salvano subito, a ogni tocco: non serve un pulsante "Salva".
// Valgono per i preventivi NUOVI: quelli già fatti restano come sono.
export function ImpostazioniPreventivi() {
  const t = useTema();
  const [impostazioni, setImpostazioni] = useState<Impostazioni>({
    aliquota_iva: ALIQUOTA_IVA_PREDEFINITA,
    marca_bollo: false,
  });

  useCaricaQuandoVisibile(() => {
    getImpostazioniPreventivi().then(setImpostazioni).catch(console.error);
  });

  // Si vede subito; se il salvataggio fallisce si torna a com'era
  const cambia = (nuove: Impostazioni) => {
    const prima = impostazioni;
    setImpostazioni(nuove);
    aggiornaImpostazioniPreventivi(nuove).catch((err) => {
      console.error(err);
      setImpostazioni(prima);
      avviso('Errore', 'Impossibile salvare le impostazioni.');
    });
  };

  const senzaIva = impostazioni.aliquota_iva === 0;

  return (
    <View
      style={[styles.card, { backgroundColor: t.card, borderColor: t.bordo }]}
    >
      {/* --- ALIQUOTA IVA --- */}
      <View style={styles.blocco}>
        <View style={styles.riga}>
          <View style={[styles.icona, { backgroundColor: t.riquadro }]}>
            <Feather name="percent" size={18} color={t.testo} />
          </View>
          <View style={styles.testi}>
            <Text style={[styles.titolo, { color: t.testo }]}>
              Aliquota IVA
            </Text>
            <Text style={[styles.spiegazione, { color: t.testoSecondario }]}>
              Proposta ai preventivi nuovi.
            </Text>
          </View>
        </View>
        <View style={styles.chips}>
          {ALIQUOTE_IVA.map((aliquota) => (
            <Chip
              key={aliquota}
              testo={`${aliquota}%`}
              attivo={impostazioni.aliquota_iva === aliquota}
              onPress={() =>
                cambia({ ...impostazioni, aliquota_iva: aliquota })
              }
              accessibilityLabel={`IVA al ${aliquota} per cento`}
            />
          ))}
        </View>
        {senzaIva && (
          <View style={[styles.nota, { backgroundColor: t.riquadro }]}>
            <Feather name="info" size={15} color={t.testoSecondario} />
            <Text style={[styles.notaTesto, { color: t.testoSecondario }]}>
              Senza IVA (regime forfettario): nel PDF compare la dicitura della
              Legge 190/2014, "Prestazione non soggetta ad IVA".
            </Text>
          </View>
        )}
      </View>

      {/* --- MARCA DA BOLLO --- */}
      <View
        style={[styles.blocco, styles.separato, { borderTopColor: t.bordo }]}
      >
        <View style={styles.riga}>
          <View style={[styles.icona, { backgroundColor: t.riquadro }]}>
            <Feather name="file-plus" size={18} color={t.testo} />
          </View>
          <View style={styles.testi}>
            <Text style={[styles.titolo, { color: t.testo }]}>
              Marca da bollo
            </Text>
            <Text style={[styles.spiegazione, { color: t.testoSecondario }]}>
              Aggiunge {formattaEuro(IMPORTO_MARCA_BOLLO)} al totale dei
              preventivi nuovi.
            </Text>
          </View>
          <Switch
            value={impostazioni.marca_bollo}
            onValueChange={(attiva) =>
              cambia({ ...impostazioni, marca_bollo: attiva })
            }
            trackColor={{ false: t.bordo, true: t.bottonePrimario }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={t.bordo}
            accessibilityLabel="Marca da bollo"
          />
        </View>
      </View>
    </View>
  );
}
