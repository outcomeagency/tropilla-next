/** Diccionario base (español rioplatense). en.ts y pt.ts deben tener la misma forma. */
export const es = {
  meta: {
    title: "TROPILLA — Productores ganaderos del NEA",
    description:
      "Encontrá productores de bovinos y búfalos del NEA argentino, mirá su oferta y consultá directo. Información declarada por cada productor, con evidencia de integridad.",
  },
  nav: {
    directory: "Directorio",
    offers: "Ofertas",
    providers: "Proveedores",
    producers: "Para productores",
    login: "Ingresar",
    language: "Idioma",
  },
  hero: {
    eyebrow: "Hecho en Corrientes, para el NEA",
    title: "Hacienda del NEA, con su historia a la vista.",
    lead: "Encontrá productores de bovinos y búfalos de Corrientes, Chaco, Formosa y Misiones, mirá lo que tienen para ofrecer y consultá directo, sin intermediarios.",
    searchLabel: "Buscar productores u ofertas",
    searchPlaceholder: "Raza, categoría o provincia — ej. bubillos Mediterráneos",
    searchCta: "Buscar",
    secondaryCta: "Soy productor",
  },
  sample: {
    label: "Ejemplo de ficha de lote",
    title: "30 bubillos Mediterráneos",
    meta: "24–28 meses · 468 kg promedio · Sistema pastoril en humedal",
    species: "Bubalino",
    headsLabel: "cabezas",
    weightLabel: "kg promedio",
    weightDetail: "Balanza 10/10/2026",
    healthLabel: "Sanidad",
    healthValue: "aftosa 2ª campaña",
    place: "General Paz, Corrientes",
  },
  how: {
    title: "Cómo funciona",
    lead: "El productor carga y elige qué mostrar. Vos mirás, comparás y consultás.",
    steps: [
      {
        title: "Buscá por lo que necesitás",
        body: "Filtrá por provincia, especie, raza, categoría o productores con oferta abierta.",
      },
      {
        title: "Mirá cada dato con su origen",
        body: "Cada dato muestra si lo declaró el productor y desde cuándo tiene su integridad registrada.",
      },
      {
        title: "Consultá directo",
        body: "Escribile al productor desde la ficha, por el portal o por WhatsApp. No necesitás cuenta.",
      },
    ],
  },
  trust: {
    levels: { declarado: "Declarado", integridad_registrada: "Integridad registrada" },
    title: "Qué significa cada nivel",
    declared: "Lo cargó el productor. Es su declaración.",
    integrity: "El registro no cambió desde la fecha indicada. Prueba integridad, no veracidad.",
  },
  producers: {
    title: "¿Tenés hacienda? Mostrala como se merece.",
    body: "Ordená tu rodeo, tu sanidad y tus documentos, y publicá sólo lo que vos elijas, en español, inglés y portugués.",
    cta: "Crear la cuenta de mi campo",
  },
  empty: {
    title: "El directorio abre pronto",
    body: "Estamos sumando a los primeros productores de Corrientes. Mientras tanto, si buscás hacienda puntual, dejanos tu consulta desde una ficha de oferta.",
  },
  footer: {
    legend:
      "Información declarada por el productor. TROPILLA registra evidencia de integridad; no certifica su contenido ni reemplaza habilitaciones oficiales.",
    androidDownload: "Descargá la app para Android",
    androidDownloadNote: "Android · v0.1.0+1 · 16/10/2026",
    rights: "TROPILLA · La plataforma integral del productor ganadero del NEA.",
  },
};

export type Dictionary = typeof es;
