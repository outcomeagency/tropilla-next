/** Secciones del perfil público (claves del contrato: `…/perfil`.secciones). */
export const SECCIONES = [
  { k: "portada", label: "Portada", desc: "Nombre, fotos, historia, zona general y asociaciones." },
  { k: "actividad", label: "Actividad", desc: "Especies, razas, actividades, superficie y ambiente." },
  { k: "rodeo", label: "Rodeo en números", desc: "Existencias por especie en rangos y % con identificación. Se calcula solo." },
  { k: "sanidad", label: "Sanidad resumida", desc: "Planes de los últimos 12 meses, sin datos individuales. Se calcula solo." },
  { k: "trazabilidad", label: "Trazabilidad", desc: "Eventos registrados, antigüedad e integridad. Se calcula solo." },
  { k: "documentos", label: "Documentos publicados", desc: "Sólo los que marcaste como públicos en Documentos." },
  { k: "oferta", label: "Ofertas y contratos", desc: "Tus ofertas publicadas y contratos a futuro abiertos." },
  { k: "contacto", label: "Formulario de contacto", desc: "Los compradores te escriben sin cuenta; llega a tu bandeja." },
  { k: "reproductores", label: "Reproductores destacados", desc: "Elegí toros y vientres para mostrar junto a su genealogía." },
  { k: "composicion", label: "Composición del rodeo", desc: "Categorías y razas por especie; elegí rangos o cantidades exactas." },
  { k: "indicadores", label: "Indicadores e historia", desc: "Preñez, partos, plan sanitario optativo y antigüedad en TROPILLA, con fecha y fuente." },
  { k: "galeria", label: "Galería", desc: "Fotos del establecimiento y reproductores seleccionados." },
] as const;

export type SeccionPerfil = (typeof SECCIONES)[number]["k"];

/** Secciones que se derivan de lo cargado y se pueden congelar. */
export const DERIVADAS = ["rodeo", "sanidad", "trazabilidad"] as const;

export const IDIOMAS_PERFIL = [
  { k: "es", label: "Español" },
  { k: "en", label: "Inglés" },
  { k: "pt", label: "Portugués" },
] as const;

/** `faltantes` de la completitud (API) → qué hacer y dónde. */
export const FALTANTES: Record<string, { texto: string; href?: string }> = {
  titulo: { texto: "Escribí un título para el perfil", href: "#textos" },
  descripcion: { texto: "Sumá una descripción corta (aparece en Google y en el directorio)", href: "#textos" },
  historia: { texto: "Contá la historia del establecimiento", href: "#textos" },
  idioma_extranjero: { texto: "Agregá la descripción en inglés o portugués", href: "#textos" },
  superficie: { texto: "Cargá la superficie del campo", href: "/establecimiento/editar" },
  potreros: { texto: "Dibujá al menos un potrero", href: "/establecimiento/potreros/nuevo" },
  hacienda: { texto: "Cargá tu hacienda", href: "/hacienda" },
  historial: { texto: "Registrá al menos 10 eventos (pesajes, vacunas, tactos…)", href: "/hacienda/eventos/nuevo" },
  fotos: { texto: "Subí fotos del campo desde la app (Documentos → Foto)" },
  oferta: { texto: "Publicá una oferta", href: "/comercializacion/ofertas/nueva" },
};

export type TextosPerfil = Partial<Record<"es" | "en" | "pt", { titulo?: string; descripcion?: string; historia?: string }>>;
