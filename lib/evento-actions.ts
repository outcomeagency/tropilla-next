"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, query } from "./api";
import { requireContexto } from "./establecimiento";
import { getCatalogos } from "./data/catalogos";
import { decimal, estadoDeError, fdStr, isFecha, postEvento, uuidv7, type EventoActionState } from "./eventos-api";
import { DENTICION, METODOS_CASTRACION, MOTIVOS_EGRESO, MOTIVOS_INGRESO, TIPOS_PERDIDA, FACILIDAD_PARTO, tipoHacienda } from "./eventos-hacienda";
import type { Many, S } from "./schemas";

export interface AnimalElegido {
  id: string;
  ident: string;
  especie: string;
  sexo: string;
  categoria: string;
  lote?: string | null;
  estado?: string | null;
  peso?: string | null;
  pesoFecha?: string | null;
  raza?: string | null;
  estadoReproductivo?: string | null;
}

/**
 * Busca un animal por cualquier identificador vigente para sumarlo a la
 * selección del evento (la app de campo hace lo mismo con el bastón).
 */
export async function buscarAnimalAction(valor: string): Promise<{ animal?: AnimalElegido; error?: string }> {
  const ctx = await requireContexto();
  const v = valor.trim().slice(0, 64);
  if (!v) return { error: "Escribí una caravana, RFID o tatuaje." };
  try {
    const r = await api<Many<S<"AnimalResumen">>>(`/establecimientos/${ctx.activa.establecimiento_id}/animales/identificador${query({ valor: v })}`);
    const a = r.data[0];
    if (!a?.id) return { error: `No encontramos «${v}» en este campo.` };
    return {
      animal: {
        id: a.id,
        ident: a.identificacion_principal ?? v,
        especie: a.especie ?? "",
        sexo: a.sexo ?? "",
        categoria: a.categoria_nombre ?? a.categoria ?? "",
        lote: a.lote?.nombre ?? null,
        estado: a.estado ?? null,
        peso: a.peso_kg ?? null,
        pesoFecha: a.peso_fecha ?? null,
        raza: a.raza ?? null,
        estadoReproductivo: a.estado_reproductivo ?? null,
      },
    };
  } catch {
    return { error: `No encontramos «${v}» en este campo.` };
  }
}

const de = <T extends readonly (readonly [string, string])[]>(lista: T, v: string) => lista.some(([c]) => c === v);
const corto = (fd: FormData, k: string, max = 120) => fdStr(fd, k).slice(0, max) || undefined;
const limpio = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== null));

/** Conteo por categoría desde inputs `c_<CODIGO>`. */
function conteoDe(fd: FormData) {
  const conteo: Record<string, number> = {};
  let invalido = false;
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("c_")) continue;
    const s = String(v).trim();
    if (!s) continue;
    if (!/^\d{1,6}$/.test(s)) invalido = true;
    else if (Number(s) > 0) conteo[k.slice(2)] = Number(s);
  }
  return { conteo, invalido };
}

/** Animales nuevos (ingreso con caravana / crías): filas `n_<campo>_<i>`. */
function animalesNuevos(fd: FormData, fields: Record<string, string>, extra: Record<string, unknown>) {
  const filas = Number(fdStr(fd, "filas") || "0");
  const out: Array<Record<string, unknown>> = [];
  const indices: number[] = [];
  const vistas = new Set<string>();
  for (let i = 0; i < Math.min(filas, 200); i++) {
    const car = fdStr(fd, `n_caravana_${i}`).slice(0, 64);
    const sexo = fdStr(fd, `n_sexo_${i}`);
    const categoria = fdStr(fd, `n_categoria_${i}`);
    const especie = fdStr(fd, `n_especie_${i}`);
    if (!car && !categoria) continue;
    if (sexo !== "M" && sexo !== "H") fields[`n_sexo_${i}`] = "Sexo";
    if (!categoria) fields[`n_categoria_${i}`] = "Categoría";
    if (car && vistas.has(car.toUpperCase())) fields[`n_caravana_${i}`] = "Repetida";
    if (car) vistas.add(car.toUpperCase());
    const nac = fdStr(fd, `n_nacimiento_${i}`);
    if (nac && !isFecha(nac)) fields[`n_nacimiento_${i}`] = "Fecha";
    indices.push(i);
    out.push(
      limpio({
        animal_id: fdStr(fd, `n_id_${i}`) || uuidv7(),
        especie,
        sexo,
        categoria,
        raza: fdStr(fd, `n_raza_${i}`) || undefined,
        fecha_nacimiento: nac || undefined,
        identificaciones: car ? [{ tipo: "caravana_visual", valor: car }] : undefined,
        ...extra,
      }),
    );
  }
  return Object.assign(out, { indices });
}

/**
 * Registrar un evento de hacienda desde el panel (TPA-22): arma sujetos y
 * payload según el tipo (JSON Schema v1 del catálogo) y lo manda por el
 * mismo camino que la app (sobre, huella y cadena del lado del servidor).
 */
export async function registrarEventoAction(_prev: EventoActionState, fd: FormData): Promise<EventoActionState> {
  const ctx = await requireContexto();
  const est = ctx.activa.establecimiento_id;
  const tipo = fdStr(fd, "tipo");
  const meta = tipoHacienda(tipo);
  if (!meta) return { error: "Elegí qué evento querés registrar." };
  const modulo = tipo.split(".")[0];
  if (!ctx.can(modulo === "reproduccion" ? "reproduccion.crear" : modulo === "sanidad" ? "sanidad.crear" : "hacienda.crear")) return { error: "Tu rol no permite cargar este evento." };

  const fields: Record<string, string> = {};
  const fecha = fdStr(fd, "ocurrido_en");
  if (!isFecha(fecha)) fields.ocurrido_en = "Indicá la fecha.";
  else if (fecha > new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)) fields.ocurrido_en = "La fecha no puede ser futura.";

  const pedido = fdStr(fd, "sujeto");
  const sujetoTipo = (pedido === "lote" || pedido === "potrero") && meta.sujetos.includes(pedido) ? pedido : "animales";
  const animalIds = [...new Set(fd.getAll("animal_id").map(String).filter(Boolean))];
  const loteId = fdStr(fd, "lote_id");
  const creaAnimales = sujetoTipo === "animales" && (tipo === "hacienda.ingreso" || tipo === "hacienda.nacimiento");

  let sujetos: S<"EventoInput">["sujetos"];
  if (sujetoTipo === "potrero") {
    const potreroId = fdStr(fd, "potrero_id");
    if (!potreroId) fields.potrero_id = "Elegí el potrero.";
    sujetos = { tipo: "potrero", potrero_id: potreroId };
  } else if (sujetoTipo === "lote") {
    if (!loteId) fields.lote_id = "Elegí el lote.";
    sujetos = { tipo: "lote", lote_id: loteId };
    if (["hacienda.ingreso", "hacienda.nacimiento", "hacienda.egreso", "hacienda.muerte", "hacienda.perdida", "hacienda.faena"].includes(tipo)) {
      const { conteo, invalido } = conteoDe(fd);
      if (invalido) fields.conteo = "Usá números enteros de cabezas.";
      else if (!Object.keys(conteo).length) fields.conteo = "Cargá cuántas cabezas, al menos en una categoría.";
      else if (!["hacienda.ingreso", "hacienda.nacimiento"].includes(tipo)) {
        const pasadas = Object.entries(conteo).filter(([c, n]) => n > Number(fdStr(fd, `d_${c}`) || "0"));
        if (pasadas.length) fields.conteo = "No pueden salir más cabezas de las que tiene el lote en esa categoría.";
      }
      sujetos.conteo = conteo;
    }
  } else {
    sujetos = { tipo: "animales", animal_ids: animalIds };
    if (!creaAnimales && !animalIds.length) fields.animales = "Sumá al menos un animal.";
  }

  let payload: Record<string, unknown> = {};
  switch (tipo) {
    case "hacienda.ingreso": {
      const motivo = fdStr(fd, "motivo");
      if (!de(MOTIVOS_INGRESO, motivo)) fields.motivo = "Elegí el motivo del ingreso.";
      const origen = limpio({ vendedor: corto(fd, "vendedor"), localidad: corto(fd, "localidad"), establecimiento: corto(fd, "establecimiento"), renspa_declarado: corto(fd, "renspa_declarado", 40) });
      payload = limpio({ motivo, origen: Object.keys(origen).length ? origen : undefined, dte_numero: corto(fd, "dte_numero", 40) });
      if (creaAnimales) {
        const destino = limpio({ lote_id: fdStr(fd, "destino_lote_id") || undefined, potrero_id: fdStr(fd, "destino_potrero_id") || undefined });
        const animales = animalesNuevos(fd, fields, destino);
        if (!animales.length) fields.animales = "Cargá al menos un animal (caravana, sexo y categoría).";
        payload.animales = animales;
        sujetos = { tipo: "animales", animal_ids: animales.map((a) => String(a.animal_id)) };
      }
      break;
    }
    case "hacienda.nacimiento": {
      const facilidad = fdStr(fd, "facilidad");
      if (facilidad && !de(FACILIDAD_PARTO, facilidad)) fields.facilidad = "Elegí una opción.";
      const madreId = fdStr(fd, "madre_id");
      payload = limpio({ facilidad: facilidad || undefined, madre_id: madreId || undefined, madre_externa: madreId ? undefined : corto(fd, "madre_externa") });
      if (creaAnimales) {
        const destino = limpio({ lote_id: fdStr(fd, "destino_lote_id") || undefined, potrero_id: fdStr(fd, "destino_potrero_id") || undefined, madre_id: madreId || undefined, madre_externa: madreId ? undefined : corto(fd, "madre_externa") });
        const crias = animalesNuevos(fd, fields, { ...destino, fecha_nacimiento: fecha });
        if (!crias.length) fields.animales = "Cargá al menos una cría.";
        payload.crias = crias.map((animal, j) => {
          const peso = decimal(fdStr(fd, `n_peso_${crias.indices[j]}`));
          return limpio({ viva: true, peso_kg: peso || undefined, animal });
        });
        sujetos = { tipo: "animales", animal_ids: crias.map((a) => String(a.animal_id)) };
      }
      break;
    }
    case "hacienda.egreso": {
      const motivo = fdStr(fd, "motivo");
      if (!de(MOTIVOS_EGRESO, motivo)) fields.motivo = "Elegí el motivo de la salida.";
      payload = limpio({
        motivo,
        destino: fdStr(fd, "destino") || undefined,
        comprador: corto(fd, "comprador"),
        dte_numero: corto(fd, "dte_numero", 40),
        destino_establecimiento: corto(fd, "destino_establecimiento"),
        renspa_destino_declarado: corto(fd, "renspa_destino_declarado", 40),
      });
      break;
    }
    case "hacienda.traslado": {
      const destino = fdStr(fd, "potrero_destino_id");
      if (!destino) fields.potrero_destino_id = "Elegí el potrero de destino.";
      payload = { potrero_destino_id: destino };
      break;
    }
    case "hacienda.cambio_lote": {
      const destino = fdStr(fd, "lote_destino_id");
      if (!destino) fields.lote_destino_id = "Elegí el lote de destino.";
      payload = { lote_destino_id: destino };
      break;
    }
    case "hacienda.castracion": {
      const metodo = fdStr(fd, "metodo");
      if (metodo && !de(METODOS_CASTRACION, metodo)) fields.metodo = "Elegí el método.";
      payload = limpio({ metodo: metodo || undefined, categoria_nueva: fdStr(fd, "categoria_nueva") || undefined });
      break;
    }
    case "hacienda.denticion": {
      const d = fdStr(fd, "denticion");
      if (!de(DENTICION, d)) fields.denticion = "Elegí la dentición.";
      payload = { denticion: d };
      break;
    }
    case "hacienda.condicion_corporal": {
      const escala = fdStr(fd, "escala");
      const valor = decimal(fdStr(fd, "valor"));
      const max = escala === "1-9" ? 9 : 5;
      if (escala !== "1-5" && escala !== "1-9") fields.escala = "Elegí la escala.";
      if (!valor || Number(valor) < 1 || Number(valor) > max) fields.valor = `Un valor entre 1 y ${max} (admite medios: 3,5).`;
      payload = { escala, valor };
      break;
    }
    case "hacienda.recategorizacion": {
      const cat = fdStr(fd, "categoria_nueva");
      if (!cat) fields.categoria_nueva = "Elegí la categoría nueva.";
      payload = { motivo: "manual", categoria_nueva: cat, sugerida: false };
      break;
    }
    case "hacienda.muerte": {
      const causa = fdStr(fd, "causa");
      if (!causa) fields.causa = "Elegí la causa.";
      payload = limpio({ causa, causa_otra: causa === "otra" ? corto(fd, "causa_otra") : undefined, hallazgos: corto(fd, "hallazgos", 2000) });
      break;
    }
    case "hacienda.perdida": {
      const t = fdStr(fd, "tipo_perdida");
      if (!de(TIPOS_PERDIDA, t)) fields.tipo_perdida = "Elegí qué pasó.";
      payload = limpio({ tipo: t, circunstancias: corto(fd, "circunstancias", 2000), denuncia_numero: corto(fd, "denuncia_numero", 40) });
      break;
    }
    case "reproduccion.servicio_natural": {
      const fin = fdStr(fd, "fin");
      if (fin && (!isFecha(fin) || fin < fecha)) fields.fin = "El fin no puede ser anterior al inicio.";
      const toros = [...new Set(fd.getAll("toro_id").map(String).filter(Boolean))];
      const externos = fdStr(fd, "toros_externos")
        .split(/[,\n]/)
        .map((t) => t.trim().slice(0, 120))
        .filter(Boolean);
      const loteToros = fdStr(fd, "lote_toros_id");
      if (!toros.length && !externos.length && !loteToros) fields.toros = "Indicá qué toros: con caravana, un lote de toros o de afuera.";
      payload = limpio({ inicio: fecha, fin: fin || undefined, toro_ids: toros.length ? toros : undefined, lote_toros_id: loteToros || undefined, toros_externos: externos.length ? externos : undefined });
      break;
    }
    case "reproduccion.inseminacion": {
      const t = fdStr(fd, "tipo_ia");
      if (t !== "ia" && t !== "iatf") fields.tipo_ia = "Elegí IA o IATF.";
      const semen = limpio({ toro_nombre: corto(fd, "toro_nombre"), raza: fdStr(fd, "semen_raza") || undefined, centro: corto(fd, "centro"), partida: corto(fd, "partida", 60) });
      if (!semen.toro_nombre) fields.toro_nombre = "Indicá el toro (nombre o código de la pajuela).";
      payload = limpio({ tipo: t, semen, inseminador: corto(fd, "inseminador") });
      break;
    }
    case "reproduccion.tacto": {
      const metodo = fdStr(fd, "metodo_tacto");
      const resultado = fdStr(fd, "resultado");
      if (metodo !== "tacto" && metodo !== "ecografia") fields.metodo_tacto = "Elegí tacto o ecografía.";
      if (resultado !== "vacia" && resultado !== "prenada") fields.resultado = "Elegí vacía o preñada.";
      const dias = fdStr(fd, "dias_gestacion");
      if (resultado === "prenada" && dias && (!/^\d{1,3}$/.test(dias) || Number(dias) < 1 || Number(dias) > 340)) fields.dias_gestacion = "Días entre 1 y 340.";
      const tamano = fdStr(fd, "tamano");
      if (resultado === "prenada" && !dias && !tamano) fields.dias_gestacion = "Indicá los días de gestación (o al menos el tamaño).";
      payload = limpio({
        metodo,
        resultado,
        dias_gestacion: resultado === "prenada" && dias ? Number(dias) : undefined,
        tamano: resultado === "prenada" && tamano ? tamano : undefined,
        veterinario: corto(fd, "veterinario"),
      });
      break;
    }
    case "reproduccion.parto": {
      const t = fdStr(fd, "tipo_parto");
      if (!["normal", "asistido", "distocico", "cesarea"].includes(t)) fields.tipo_parto = "Elegí cómo fue el parto.";
      if (animalIds.length !== 1) fields.animales = "Un parto es de una sola madre.";
      const madre = animalIds.length === 1 ? await api<{ data: S<"AnimalResumen"> }>(`/establecimientos/${est}/animales/${animalIds[0]}`).then((r) => r.data).catch(() => null) : null;
      const n = Math.min(Number(fdStr(fd, "crias") || "0"), 4);
      const cat = await getCatalogos();
      const crias: Array<Record<string, unknown>> = [];
      for (let i = 0; i < n; i++) {
        const viva = fd.get(`cr_viva_${i}`) === "1";
        const sexo = fdStr(fd, `cr_sexo_${i}`);
        if (sexo !== "M" && sexo !== "H") {
          fields[`cr_sexo_${i}`] = "Sexo";
          continue;
        }
        const peso = decimal(fdStr(fd, `cr_peso_${i}`));
        if (peso === null) fields[`cr_peso_${i}`] = "Peso";
        if (!viva) {
          crias.push(limpio({ viva: false, sexo, peso_kg: peso || undefined }));
          continue;
        }
        const categoria = cat.categorias.find((c) => c.especie === madre?.especie && c.sexo === sexo && c.es_cria)?.codigo;
        const car = fdStr(fd, `cr_caravana_${i}`).slice(0, 64);
        crias.push(
          limpio({
            viva: true,
            peso_kg: peso || undefined,
            animal: limpio({
              animal_id: fdStr(fd, `cr_id_${i}`) || uuidv7(),
              especie: madre?.especie,
              sexo,
              categoria,
              raza: fdStr(fd, `cr_raza_${i}`) || madre?.raza || undefined,
              fecha_nacimiento: fecha,
              madre_id: animalIds[0],
              lote_id: madre?.lote?.id || undefined,
              potrero_id: madre?.potrero?.id || undefined,
              identificaciones: car ? [{ tipo: "caravana_visual", valor: car }] : undefined,
            }),
          }),
        );
      }
      if (!n) fields.crias = "Cargá al menos una cría (viva o muerta).";
      payload = { tipo: t, crias };
      break;
    }
    case "reproduccion.aborto": {
      const dias = fdStr(fd, "dias_gestacion");
      if (dias && (!/^\d{1,3}$/.test(dias) || Number(dias) < 1)) fields.dias_gestacion = "Días de gestación estimados (número).";
      payload = limpio({ dias_gestacion: dias ? Number(dias) : undefined, causa_presunta: corto(fd, "causa_presunta") });
      break;
    }
    case "reproduccion.destete": {
      const t = fdStr(fd, "tipo_destete");
      if (!["tradicional", "precoz", "hiperprecoz"].includes(t)) fields.tipo_destete = "Elegí el tipo de destete.";
      const peso = decimal(fdStr(fd, "peso_kg"));
      if (peso === null) fields.peso_kg = "Peso en kg (ej. 165,5).";
      payload = limpio({ tipo: t, peso_kg: peso || undefined, categoria_nueva: fdStr(fd, "categoria_nueva") || undefined });
      break;
    }
    case "sanidad.vacunacion":
    case "sanidad.desparasitacion":
    case "sanidad.tratamiento": {
      const productoId = fdStr(fd, "producto_id");
      const nombre = corto(fd, "producto_nombre", 200);
      const diasRetiro = (k: string) => {
        const v = fdStr(fd, k);
        if (!v) return undefined;
        if (!/^\d{1,3}$/.test(v)) {
          fields[k] = "Días enteros.";
          return undefined;
        }
        return Number(v);
      };
      const comun = {
        producto_id: productoId && productoId !== "_otro" ? productoId : undefined,
        producto_nombre: nombre,
        dosis_aplicada: corto(fd, "dosis_aplicada", 200),
        retiro_carne_dias: diasRetiro("retiro_carne_dias"),
        retiro_leche_dias: diasRetiro("retiro_leche_dias"),
        tarea_id: fdStr(fd, "tarea_id") || undefined,
      };
      if (tipo === "sanidad.vacunacion") {
        if (!nombre) fields.producto_id = "Elegí el producto o escribí su nombre.";
        const enfermedad = fdStr(fd, "enfermedad");
        if (!enfermedad) fields.enfermedad = "Elegí contra qué enfermedad.";
        const vence = fdStr(fd, "envase_vence");
        if (vence && !isFecha(vence)) fields.envase_vence = "Fecha inválida.";
        payload = limpio({
          ...comun,
          enfermedad,
          numero_dosis: fdStr(fd, "numero_dosis") || undefined,
          via: fdStr(fd, "via") || undefined,
          vacunador: corto(fd, "vacunador", 200),
          campana: corto(fd, "campana", 200),
          envase_lote: corto(fd, "envase_lote", 200),
          envase_vence: vence || undefined,
        });
      } else if (tipo === "sanidad.desparasitacion") {
        if (!nombre) fields.producto_id = "Elegí el producto o escribí su nombre.";
        const t = fdStr(fd, "tipo_desparasitacion");
        if (!["interno", "externo", "ambos"].includes(t)) fields.tipo_desparasitacion = "Elegí interna, externa o ambas.";
        const peso = decimal(fdStr(fd, "peso_dosificacion_kg"));
        if (peso === null) fields.peso_dosificacion_kg = "Peso en kg (ej. 420).";
        payload = limpio({
          ...comun,
          tipo: t,
          principio_activo: corto(fd, "principio_activo", 200),
          metodo_dosificacion: fdStr(fd, "metodo_dosificacion") || undefined,
          peso_dosificacion_kg: peso || undefined,
        });
      } else {
        const dx = corto(fd, "diagnostico_presuntivo", 200);
        if (!dx) fields.diagnostico_presuntivo = "Indicá el diagnóstico presuntivo.";
        const dur = fdStr(fd, "duracion_dias");
        if (dur && !/^\d{1,3}$/.test(dur)) fields.duracion_dias = "Días enteros.";
        payload = limpio({ ...comun, diagnostico_presuntivo: dx, duracion_dias: dur ? Number(dur) : undefined, veterinario: corto(fd, "veterinario", 200) });
      }
      break;
    }
    case "hacienda.faena": {
      const frig = corto(fd, "frigorifico");
      if (!frig) fields.frigorifico = "Indicá el frigorífico.";
      const kg = (k: string) => {
        const s = fdStr(fd, k);
        if (!s) return undefined;
        const d = decimal(s);
        if (!d || Number(d) <= 0) fields[k] = "Un número en kg (ej. 245,5).";
        return d ?? undefined;
      };
      payload = limpio({
        frigorifico: frig,
        tropa_numero: corto(fd, "tropa_numero", 40),
        peso_vivo_kg: kg("peso_vivo_kg"),
        pcc_kg: kg("pcc_kg"),
        pcf_kg: kg("pcf_kg"),
        tipificacion: corto(fd, "tipificacion", 40),
        categoria_faena: fdStr(fd, "categoria_faena") || undefined,
        decomisos: corto(fd, "decomisos", 2000),
      });
      break;
    }
  }

  if (Object.keys(fields).length) {
    const n = Object.keys(fields).length;
    return { fields, error: n === 1 && !Object.keys(fields)[0].startsWith("n_") ? Object.values(fields)[0] : "Revisá los datos marcados." };
  }

  const idem = fdStr(fd, "idem") || uuidv7();
  let nuevoId = idem;
  try {
    const ev = await postEvento(est, {
      id: idem,
      tipo,
      sujetos,
      payload,
      ocurrido_en: fecha,
      observaciones: fdStr(fd, "observaciones").slice(0, 2000) || null,
      confirmar_advertencias: fd.get("confirmar") === "1",
    });
    nuevoId = ev.id ?? idem;
  } catch (e) {
    return estadoDeError(
      e,
      {
        "sujetos.animal_ids": "animales",
        "sujetos.lote_id": "lote_id",
        "sujetos.conteo": "conteo",
        "sujetos.potrero_id": "potrero_id",
        "payload.tipo": { "reproduccion.parto": "tipo_parto", "reproduccion.destete": "tipo_destete", "reproduccion.inseminacion": "tipo_ia", "sanidad.desparasitacion": "tipo_desparasitacion" }[tipo] ?? "tipo_perdida",
        "payload.toro_ids": "toros",
        "payload.animales": "animales",
        "payload.crias": tipo === "reproduccion.parto" ? "crias" : "animales",
      },
      "No pudimos registrar el evento. Probá de nuevo.",
    );
  }
  revalidatePath("/hacienda", "layout");
  if (modulo === "sanidad") revalidatePath("/sanidad", "layout");
  redirect(`/hacienda/eventos/${nuevoId}?ok=registrado`);
}
