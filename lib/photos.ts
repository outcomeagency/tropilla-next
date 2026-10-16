/**
 * Fotos de campo de licencia libre (Unsplash License) mientras no haya fotos
 * propias de productores del NEA. Sólo búfalo de agua (nunca búfalo africano),
 * cebuinos/británicos y paisajes de humedal y pastizal parecidos a Corrientes.
 * Reemplazar por fotos reales del cliente cuando lleguen (visual-identity §8).
 */
/** Original acotado a 1600 px (Unsplash) para que el optimizador de Next no baje 5000 px. */
export const PHOTO_QUERY = "?w=1600&q=80&fm=jpg&fit=crop";
const u = (id: string) => `https://images.unsplash.com/photo-${id}${PHOTO_QUERY}`;

export const PHOTOS = {
  /** Rodeo de búfalos de agua en pastizal (hero de oferta bubalina). */
  bufalosPastizal: { src: u("1635192644034-c088f0545e4b"), alt: "Rodeo de búfalos pastando en un potrero abierto" },
  bufaloAgua: { src: u("1626041934397-aa2dbadac561"), alt: "Búfalo de agua refrescándose en una laguna" },
  bufaloRetrato: { src: u("1619452104266-0d23df2119ac"), alt: "Búfala de agua de frente, en el monte" },
  bufaloLaguna: { src: u("1559038210-b53efb44b59c"), alt: "Búfalo en la orilla de una laguna" },
  bufaloCorral: { src: u("1689534155879-2cdcf3536f1f"), alt: "Búfalos en el corral" },
  brahmanToros: { src: u("1774828732384-6c0134c29425"), alt: "Dos toros Brahman en el potrero" },
  brahmanRodeo: { src: u("1788157980088-f37fe2f4714f"), alt: "Hacienda Brahman en pastizal verde" },
  angusMonte: { src: u("1781026430661-353896768708"), alt: "Terneros Angus negro entre troncos en el monte" },
  angusCaravanas: { src: u("1636808674522-83fec350e43d"), alt: "Vaquillonas con caravana mirando a cámara" },
  vacaHumedal: { src: u("1759254805300-ba81cb97a421"), alt: "Vaca pastando en un bañado" },
  estero: { src: u("1774564603711-d5e68c0b73f5"), alt: "Estero con hacienda pastando y una garza en vuelo" },
  campoCorral: { src: u("1783804450195-721467590267"), alt: "Potrero con corral y hacienda bajo cielo nublado" },
  cruceAgua: { src: u("1762709610215-67e4a13fb6db"), alt: "Hacienda cruzando un bañado al atardecer" },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
