/**
 * Evaluación nutricional por 100 g según criterios del Código Alimentario Argentino
 * y del rotulado frontal (Ley 27.642 / Decreto 151/2022, 2.ª etapa — perfil OPS).
 *
 * Referencias de corte usadas (alimentos sólidos, por 100 g):
 * - Sodio: bajo ≤ 120 mg; muy bajo ≤ 40 mg; exceso ≥ 300 mg o ≥ 1 mg Na/kcal.
 * - Azúcares/carbohidratos simples: exceso si ≥ 10% de la energía o ≥ 10 g/100 g.
 * - Grasas saturadas: bajo ≤ 1,5 g; exceso si ≥ 10% de la energía.
 * - Grasas trans: exceso si ≥ 1% de la energía; objetivo CAA ≈ 0 g industriales.
 * - Colesterol: bajo ≤ 20 mg/100 g (declaraciones CAA / Codex).
 * - Proteínas: fuente ≥ 10% de la energía o ≥ 5 g/100 g; alto ≥ 20% de la energía.
 * - Fibra: fuente ≥ 3 g/100 g; alto contenido ≥ 6 g/100 g.
 * - Vitaminas y minerales: “fuente” ≥ 15% del VRN por 100 g (Codex / CAA).
 */

const VRN = {
  calcio_mg: 1000,
  magnesio_mg: 310,
  vitamina_a_ug: 800,
  vitamina_b_mg: 1.4,
  vitamina_c_mg: 60,
  vitamina_d_ug: 5,
};

const COLORES = {
  muySaludable: "#2E7D32",
  saludable: "#7CB342",
  medianamente: "#F9A825",
  poco: "#EF6C00",
  noRecomendable: "#C62828",
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function extraerNutrientes(input = {}) {
  const vitaminas = input.vitaminas || {};
  const grasas = input.grasas || {};

  const proteinas_g = toNumber(input.proteinas_g);
  const fibra_g = toNumber(input.fibra_g);
  const carbohidratos_simples_g = toNumber(input.carbohidratos_simples_g);
  const saturadas_g = toNumber(grasas.saturadas_g);
  const monoinsaturadas_g = toNumber(grasas.monoinsaturadas_g);
  const poliinsaturadas_g = toNumber(grasas.poliinsaturadas_g);
  const trans_g = toNumber(grasas.trans_g);
  const grasas_totales_g =
    saturadas_g + monoinsaturadas_g + poliinsaturadas_g + trans_g;

  const kcal =
    proteinas_g * 4 +
    carbohidratos_simples_g * 4 +
    fibra_g * 2 +
    grasas_totales_g * 9;

  return {
    proteinas_g,
    calcio_mg: toNumber(input.calcio_mg),
    magnesio_mg: toNumber(input.magnesio_mg),
    fibra_g,
    carbohidratos_simples_g,
    sodio_mg: toNumber(input.sodio_mg),
    colesterol_mg: toNumber(input.colesterol_mg),
    minerales_otros_mg: toNumber(input.minerales_otros_mg),
    vitaminas: {
      a_ug: toNumber(vitaminas.a_ug),
      b_mg: toNumber(vitaminas.b_mg),
      c_mg: toNumber(vitaminas.c_mg),
      d_ug: toNumber(vitaminas.d_ug),
      otras: vitaminas.otras ?? null,
    },
    grasas: {
      saturadas_g,
      monoinsaturadas_g,
      poliinsaturadas_g,
      trans_g,
      totales_g: round1(grasas_totales_g),
    },
    kcal: round1(kcal),
  };
}

function pctEnergia(gramos, kcalPorGramo, kcal) {
  if (kcal <= 0) return 0;
  return ((gramos * kcalPorGramo) / kcal) * 100;
}

function esFuente(valor, vrn) {
  return vrn > 0 && valor >= vrn * 0.15;
}

function esAlto(valor, vrn) {
  return vrn > 0 && valor >= vrn * 0.3;
}

function evaluarSegunCAA(valoresPor100g = {}) {
  const n = extraerNutrientes(valoresPor100g);
  const resumen = [];
  let puntuacion = 55;
  let excesosCriticos = 0;

  // --- Sodio (CAA + Ley 27.642 2.ª etapa) ---
  const sodioPorKcal = n.kcal > 0 ? n.sodio_mg / n.kcal : 0;
  const excesoSodio = n.sodio_mg >= 300 || sodioPorKcal >= 1;

  if (n.sodio_mg <= 40) {
    puntuacion += 12;
    resumen.push({
      tipo: "favor",
      nutriente: "Sodio",
      texto: `Muy bajo en sodio (${round1(n.sodio_mg)} mg/100 g; CAA ≤ 40 mg).`,
    });
  } else if (n.sodio_mg <= 120) {
    puntuacion += 8;
    resumen.push({
      tipo: "favor",
      nutriente: "Sodio",
      texto: `Bajo en sodio (${round1(n.sodio_mg)} mg/100 g; CAA ≤ 120 mg).`,
    });
  } else if (excesoSodio) {
    excesosCriticos += 1;
    puntuacion -= 22;
    resumen.push({
      tipo: "contra",
      nutriente: "Sodio",
      texto: `Exceso de sodio (${round1(n.sodio_mg)} mg/100 g). Corte CAA/Ley 27.642: ≥ 300 mg/100 g o ≥ 1 mg/kcal.`,
    });
  } else {
    puntuacion -= 6;
    resumen.push({
      tipo: "contra",
      nutriente: "Sodio",
      texto: `Sodio moderado-alto (${round1(n.sodio_mg)} mg/100 g), por encima del criterio “bajo en sodio” (≤ 120 mg).`,
    });
  }

  // --- Azúcares / carbohidratos simples ---
  const pctAzucares = pctEnergia(n.carbohidratos_simples_g, 4, n.kcal);
  const excesoAzucares = pctAzucares >= 10 || n.carbohidratos_simples_g >= 10;

  if (n.carbohidratos_simples_g <= 5 && n.carbohidratos_simples_g >= 0) {
    puntuacion += 10;
    resumen.push({
      tipo: "favor",
      nutriente: "Azúcares / carbohidratos simples",
      texto: `Bajo contenido de azúcares simples (${round1(n.carbohidratos_simples_g)} g/100 g).`,
    });
  } else if (excesoAzucares) {
    excesosCriticos += 1;
    puntuacion -= 20;
    resumen.push({
      tipo: "contra",
      nutriente: "Azúcares / carbohidratos simples",
      texto: `Exceso de azúcares simples (${round1(n.carbohidratos_simples_g)} g/100 g, ${round1(pctAzucares)}% de la energía). Corte: ≥ 10% de la energía o ≥ 10 g/100 g.`,
    });
  } else {
    puntuacion -= 4;
    resumen.push({
      tipo: "contra",
      nutriente: "Azúcares / carbohidratos simples",
      texto: `Azúcares simples moderados (${round1(n.carbohidratos_simples_g)} g/100 g).`,
    });
  }

  // --- Grasas saturadas y trans ---
  const pctSaturadas = pctEnergia(n.grasas.saturadas_g, 9, n.kcal);
  const pctTrans = pctEnergia(n.grasas.trans_g, 9, n.kcal);
  const excesoSaturadas = pctSaturadas >= 10;
  const excesoTrans = pctTrans >= 1 || n.grasas.trans_g >= 0.5;

  if (n.grasas.saturadas_g <= 1.5) {
    puntuacion += 8;
    resumen.push({
      tipo: "favor",
      nutriente: "Grasas saturadas",
      texto: `Bajo en grasas saturadas (${round1(n.grasas.saturadas_g)} g/100 g; CAA ≤ 1,5 g).`,
    });
  } else if (excesoSaturadas) {
    excesosCriticos += 1;
    puntuacion -= 18;
    resumen.push({
      tipo: "contra",
      nutriente: "Grasas saturadas",
      texto: `Exceso de grasas saturadas (${round1(n.grasas.saturadas_g)} g/100 g, ${round1(pctSaturadas)}% de la energía). Corte Ley 27.642: ≥ 10% de la energía.`,
    });
  } else {
    puntuacion -= 5;
    resumen.push({
      tipo: "contra",
      nutriente: "Grasas saturadas",
      texto: `Grasas saturadas intermedias (${round1(n.grasas.saturadas_g)} g/100 g).`,
    });
  }

  if (n.grasas.trans_g <= 0.1) {
    puntuacion += 8;
    resumen.push({
      tipo: "favor",
      nutriente: "Grasas trans",
      texto: `Sin grasas trans relevantes (${round1(n.grasas.trans_g)} g/100 g). El CAA apunta a eliminar trans industriales.`,
    });
  } else if (excesoTrans) {
    excesosCriticos += 1;
    puntuacion -= 20;
    resumen.push({
      tipo: "contra",
      nutriente: "Grasas trans",
      texto: `Exceso de grasas trans (${round1(n.grasas.trans_g)} g/100 g). Corte: ≥ 1% de la energía.`,
    });
  } else {
    puntuacion -= 8;
    resumen.push({
      tipo: "contra",
      nutriente: "Grasas trans",
      texto: `Presencia de grasas trans (${round1(n.grasas.trans_g)} g/100 g). Se recomienda acercarse a 0 g.`,
    });
  }

  if (n.grasas.monoinsaturadas_g + n.grasas.poliinsaturadas_g >= 5 && !excesoSaturadas) {
    puntuacion += 4;
    resumen.push({
      tipo: "favor",
      nutriente: "Grasas insaturadas",
      texto: `Aporte favorable de grasas mono y poliinsaturadas (${round1(n.grasas.monoinsaturadas_g + n.grasas.poliinsaturadas_g)} g/100 g).`,
    });
  }

  if (n.colesterol_mg <= 20) {
    puntuacion += 4;
    resumen.push({
      tipo: "favor",
      nutriente: "Colesterol",
      texto: `Bajo colesterol (${round1(n.colesterol_mg)} mg/100 g; criterio CAA/Codex ≤ 20 mg).`,
    });
  } else if (n.colesterol_mg >= 90) {
    puntuacion -= 8;
    resumen.push({
      tipo: "contra",
      nutriente: "Colesterol",
      texto: `Colesterol elevado (${round1(n.colesterol_mg)} mg/100 g).`,
    });
  }

  // --- Proteínas ---
  const pctProteinas = pctEnergia(n.proteinas_g, 4, n.kcal);
  if (n.proteinas_g >= 10 || pctProteinas >= 20) {
    puntuacion += 12;
    resumen.push({
      tipo: "favor",
      nutriente: "Proteínas",
      texto: `Alto aporte proteico (${round1(n.proteinas_g)} g/100 g, ${round1(pctProteinas)}% de la energía).`,
    });
  } else if (n.proteinas_g >= 5 || pctProteinas >= 10) {
    puntuacion += 7;
    resumen.push({
      tipo: "favor",
      nutriente: "Proteínas",
      texto: `Fuente de proteínas (${round1(n.proteinas_g)} g/100 g; CAA/Codex: ≥ 5 g/100 g o ≥ 10% de la energía).`,
    });
  } else {
    puntuacion -= 4;
    resumen.push({
      tipo: "contra",
      nutriente: "Proteínas",
      texto: `Bajo aporte proteico (${round1(n.proteinas_g)} g/100 g).`,
    });
  }

  // --- Fibra ---
  if (n.fibra_g >= 6) {
    puntuacion += 12;
    resumen.push({
      tipo: "favor",
      nutriente: "Fibra",
      texto: `Alto contenido de fibra (${round1(n.fibra_g)} g/100 g; CAA ≥ 6 g).`,
    });
  } else if (n.fibra_g >= 3) {
    puntuacion += 7;
    resumen.push({
      tipo: "favor",
      nutriente: "Fibra",
      texto: `Fuente de fibra (${round1(n.fibra_g)} g/100 g; CAA ≥ 3 g).`,
    });
  } else {
    puntuacion -= 4;
    resumen.push({
      tipo: "contra",
      nutriente: "Fibra",
      texto: `Fibra insuficiente (${round1(n.fibra_g)} g/100 g; se espera ≥ 3 g/100 g para “fuente”).`,
    });
  }

  // --- Vitaminas ---
  const vitaminasFavor = [];
  const vitaminasContra = [];

  if (esAlto(n.vitaminas.a_ug, VRN.vitamina_a_ug) || esFuente(n.vitaminas.a_ug, VRN.vitamina_a_ug)) {
    vitaminasFavor.push(`A (${round1(n.vitaminas.a_ug)} µg)`);
  } else {
    vitaminasContra.push("A");
  }

  if (esAlto(n.vitaminas.b_mg, VRN.vitamina_b_mg) || esFuente(n.vitaminas.b_mg, VRN.vitamina_b_mg)) {
    vitaminasFavor.push(`B (${round1(n.vitaminas.b_mg)} mg)`);
  } else {
    vitaminasContra.push("B");
  }

  if (esAlto(n.vitaminas.c_mg, VRN.vitamina_c_mg) || esFuente(n.vitaminas.c_mg, VRN.vitamina_c_mg)) {
    vitaminasFavor.push(`C (${round1(n.vitaminas.c_mg)} mg)`);
  } else {
    vitaminasContra.push("C");
  }

  if (esAlto(n.vitaminas.d_ug, VRN.vitamina_d_ug) || esFuente(n.vitaminas.d_ug, VRN.vitamina_d_ug)) {
    vitaminasFavor.push(`D (${round1(n.vitaminas.d_ug)} µg)`);
  } else {
    vitaminasContra.push("D");
  }

  if (n.vitaminas.otras) {
    vitaminasFavor.push(`otras (${String(n.vitaminas.otras)})`);
  }

  if (vitaminasFavor.length >= 2) {
    puntuacion += 10;
    resumen.push({
      tipo: "favor",
      nutriente: "Vitaminas",
      texto: `Aporte relevante de vitaminas (≥ 15% VRN/100 g): ${vitaminasFavor.join(", ")}.`,
    });
  } else if (vitaminasFavor.length === 1) {
    puntuacion += 5;
    resumen.push({
      tipo: "favor",
      nutriente: "Vitaminas",
      texto: `Fuente de vitamina ${vitaminasFavor[0]} (≥ 15% VRN por 100 g, CAA/Codex).`,
    });
  }

  if (vitaminasContra.length >= 3) {
    puntuacion -= 5;
    resumen.push({
      tipo: "contra",
      nutriente: "Vitaminas",
      texto: `Bajo aporte de vitaminas ${vitaminasContra.join(", ")} respecto del 15% del VRN por 100 g.`,
    });
  }

  // --- Minerales ---
  const mineralesFavor = [];
  if (esAlto(n.calcio_mg, VRN.calcio_mg)) {
    mineralesFavor.push(`calcio alto (${round1(n.calcio_mg)} mg)`);
    puntuacion += 8;
  } else if (esFuente(n.calcio_mg, VRN.calcio_mg)) {
    mineralesFavor.push(`calcio (${round1(n.calcio_mg)} mg, fuente)`);
    puntuacion += 5;
  }

  if (esAlto(n.magnesio_mg, VRN.magnesio_mg)) {
    mineralesFavor.push(`magnesio alto (${round1(n.magnesio_mg)} mg)`);
    puntuacion += 6;
  } else if (esFuente(n.magnesio_mg, VRN.magnesio_mg)) {
    mineralesFavor.push(`magnesio (${round1(n.magnesio_mg)} mg, fuente)`);
    puntuacion += 4;
  }

  if (n.minerales_otros_mg >= 15) {
    mineralesFavor.push(`otros minerales (${round1(n.minerales_otros_mg)} mg)`);
    puntuacion += 2;
  }

  if (mineralesFavor.length > 0) {
    resumen.push({
      tipo: "favor",
      nutriente: "Minerales",
      texto: `Aporte mineral: ${mineralesFavor.join("; ")}. Criterio CAA/Codex: fuente ≥ 15% VRN/100 g.`,
    });
  } else {
    puntuacion -= 5;
    resumen.push({
      tipo: "contra",
      nutriente: "Minerales",
      texto: `Calcio (${round1(n.calcio_mg)} mg) y magnesio (${round1(n.magnesio_mg)} mg) por debajo del 15% del VRN por 100 g.`,
    });
  }

  if (excesosCriticos >= 3) {
    puntuacion = Math.min(puntuacion, 24);
  } else if (excesosCriticos === 2) {
    puntuacion = Math.min(puntuacion, 44);
  } else if (excesosCriticos === 1) {
    puntuacion = Math.min(puntuacion, 64);
  }

  puntuacion = Math.round(clamp(puntuacion, 0, 100));

  let clasificacion;
  let color;

  if (puntuacion >= 80) {
    clasificacion = "Muy Saludable";
    color = COLORES.muySaludable;
  } else if (puntuacion >= 65) {
    clasificacion = "Saludable";
    color = COLORES.saludable;
  } else if (puntuacion >= 45) {
    clasificacion = "Medianamente Saludable";
    color = COLORES.medianamente;
  } else if (puntuacion >= 25) {
    clasificacion = "Poco Saludable";
    color = COLORES.poco;
  } else {
    clasificacion = "No Recomendable";
    color = COLORES.noRecomendable;
  }

  return {
    clasificacion,
    color,
    puntuacion,
    resumen,
    excesosCriticos,
    nutrientesNormalizados: n,
  };
}

module.exports = { evaluarSegunCAA };
