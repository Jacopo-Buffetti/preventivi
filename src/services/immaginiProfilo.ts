import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// =====================================================================
// FIRMA E TIMBRO DEL PROFESSIONISTA
// =====================================================================
// Le immagini scelte nel profilo vengono preparate prima di salvarle:
// - ridimensionate: nel PDF la firma è larga circa 5 cm e il timbro 4,
//   quindi qualche centinaio di pixel bastano e avanzano per la stampa;
// - restano PNG se erano PNG, così la TRASPARENZA si conserva e la firma
//   si appoggia sul timbro senza un rettangolo bianco intorno;
// - le foto (JPEG, HEIC...) diventano JPEG. Il fondo bianco del foglio
//   nel PDF sparisce lo stesso: l'immagine è stampata in modalità
//   "moltiplica", in cui il bianco diventa trasparente (vedi stilePreventivo.ts).
//
// Il risultato è un data URI (data:image/png;base64,...), come il logo del
// biglietto: sta nella riga del profilo e viaggia con la sincronizzazione.
// =====================================================================

export type ImmagineProfilo = 'firma' | 'timbro';

// Lato lungo massimo, in pixel
const LATO_MASSIMO: Record<ImmagineProfilo, number> = {
  firma: 900,
  timbro: 700,
};

// Peso massimo dell'immagine: viaggia dentro la riga del profilo,
// quindi deve restare leggera
const PESO_MASSIMO = 200 * 1024; // 200 KB

// Dal più nitido al più leggero; per i PNG la qualità non conta,
// si riduce solo la dimensione
const TENTATIVI = [
  { scala: 1, qualita: 0.85 },
  { scala: 0.75, qualita: 0.75 },
  { scala: 0.5, qualita: 0.65 },
  { scala: 0.35, qualita: 0.6 },
];

export class ImmagineTroppoGrande extends Error {
  constructor() {
    super('Immagine troppo grande');
    this.name = 'ImmagineTroppoGrande';
  }
}

export async function preparaImmagineProfilo(
  uri: string,
  mimeType: string | null | undefined,
  tipo: ImmagineProfilo
): Promise<string> {
  const png =
    mimeType === 'image/png' ||
    (!mimeType && uri.split('?')[0].toLowerCase().endsWith('.png'));

  // Prima lettura: serve solo a conoscere le dimensioni
  const lettura = ImageManipulator.manipulate(uri);
  const originale = await lettura.renderAsync();
  const { width, height } = originale;
  originale.release();
  lettura.release();
  const latoLungo = Math.max(width, height);

  for (const { scala, qualita } of TENTATIVI) {
    const lato = Math.round(LATO_MASSIMO[tipo] * scala);
    const contesto = ImageManipulator.manipulate(uri);
    if (latoLungo > lato) {
      // Si indica solo il lato lungo: l'altro segue, senza deformare
      contesto.resize(width >= height ? { width: lato } : { height: lato });
    }
    const immagine = await contesto.renderAsync();
    const salvata = await immagine.saveAsync({
      format: png ? SaveFormat.PNG : SaveFormat.JPEG,
      compress: qualita,
      base64: true,
    });
    immagine.release();
    contesto.release();

    const base64 = salvata.base64 ?? '';
    // Peso reale: ogni 4 caratteri base64 sono 3 byte
    const peso = (base64.length * 3) / 4;
    if (base64 && peso <= PESO_MASSIMO) {
      return `data:image/${png ? 'png' : 'jpeg'};base64,${base64}`;
    }
  }

  throw new ImmagineTroppoGrande();
}
