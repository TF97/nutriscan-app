require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { evaluarSegunCAA } = require("./utils/evaluarSegunCAA");
const { admin, db } = require("./config/firebase");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const GEMINI_PROMPT = `Analizá esta imagen de un alimento o su rótulo nutricional.

Devolvé ÚNICAMENTE un JSON válido, sin markdown ni texto extra, con esta estructura exacta.
Todos los nutrientes deben estar estimados o leídos POR CADA 100 GRAMOS de producto.
Si un valor no figura en la imagen, estimá con criterio nutricional razonable (no uses null).

{
  "nombre": "string",
  "categoria": "Galletitas",
  "texto_tabla_nutricional": "Transcripción textual o resumen descriptivo de los datos, ingredientes y valores visibles en la tabla nutricional.",
  "proteinas_g": 0,
  "calcio_mg": 0,
  "magnesio_mg": 0,
  "fibra_g": 0,
  "carbohidratos_simples_g": 0,
  "sodio_mg": 0,
  "colesterol_mg": 0,
  "minerales_otros_mg": 0,
  "vitaminas": {
    "a_ug": 0,
    "b_mg": 0,
    "c_mg": 0,
    "d_ug": 0,
    "otras": ""
  },
  "grasas": {
    "saturadas_g": 0,
    "monoinsaturadas_g": 0,
    "poliinsaturadas_g": 0,
    "trans_g": 0
  }
}

Reglas:
- categoria: una categoría corta en español, en singular o plural habitual de góndola. Ejemplos: Galletitas, Mermeladas, Café, Lácteos, Bebidas, Snacks, Cereales, Fiambres, Panificados, Aceites, Condimentos, Otros.
- texto_tabla_nutricional: Transcribe brevemente el texto principal que detectes en la tabla/rótulo nutricional de la imagen (por ejemplo: "Porción 30g, Valor energético 120kcal, Carbohidratos 20g, Proteínas 2g...").
- Números en punto decimal, no comas.
- carbohidratos_simples_g = azúcares / hidratos de carbono simples por 100 g.
- vitaminas.a_ug y vitaminas.d_ug en microgramos; b_mg y c_mg en miligramos.
- minerales_otros_mg: suma aproximada de hierro, zinc, potasio u otros minerales destacados (en mg / 100 g), excluyendo calcio y magnesio.
- vitaminas.otras: texto breve o vacío.`;

function parseGeminiJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Gemini no devolvió texto");
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

// Modelos vigentes de la API de Google Gemini
const GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.6-pro"
];

function stripDataUrl(image) {
  if (typeof image !== "string") return image;
  const match = image.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
  return match ? match[1] : image;
}

function isModelUnavailableError(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  const status = error?.status || error?.statusCode;
  return (
    status === 404 ||
    status === 503 ||
    msg.includes("not found") ||
    msg.includes("not supported") ||
    msg.includes("unknown model") ||
    msg.includes("invalid model") ||
    msg.includes("no longer available") ||
    msg.includes("high demand") ||
    msg.includes("unavailable")
  );
}

async function generateScanContent(imageData, mimeType) {
  let lastError;

  for (const modelName of GEMINI_MODELS) {
    try {
      console.log(`Intentando analizar con el modelo: ${modelName}...`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent([
        GEMINI_PROMPT,
        {
          inlineData: {
            data: imageData,
            mimeType: mimeType || "image/jpeg",
          },
        },
      ]);

      return { result, modelName };
    } catch (error) {
      lastError = error;
      console.warn(`Falló ${modelName} (${error.status || error.message}), probando siguiente modelo...`);
      if (!isModelUnavailableError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

function slugify(text) {
  const slug = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "sin-nombre";
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return value;
}

function serializeProducto(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...data,
    fechaCreacion: serializeTimestamp(data.fechaCreacion),
    fechaActualizacion: serializeTimestamp(data.fechaActualizacion),
  };
}

async function asegurarCategoria(nombreCategoria) {
  const nombre = nombreCategoria || "Otros";
  const categoriaRef = db.collection("categorias").doc(slugify(nombre));
  const existente = await categoriaRef.get();

  if (!existente.exists) {
    await categoriaRef.set({
      nombre,
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return nombre;
}

async function guardarProducto({ nombre, categoria, nutrientes, evaluacionCAA }) {
  const productoRef = db.collection("productos").doc(slugify(nombre));
  const existente = await productoRef.get();
  const ahora = admin.firestore.FieldValue.serverTimestamp();

  const payload = {
    nombre,
    categoria,
    nutrientes,
    evaluacionCAA,
    puntuacion: evaluacionCAA.puntuacion,
    fechaActualizacion: ahora,
  };

  if (existente.exists) {
    await productoRef.set(payload, { merge: true });
  } else {
    await productoRef.set({
      ...payload,
      fechaCreacion: ahora,
    });
  }

  return productoRef.id;
}

app.get("/", (req, res) => {
  res.send("Servidor NutriScan activo");
});

app.post("/api/v1/scan", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "Falta la imagen. Envía { image: '<base64>', mimeType: 'image/jpeg' }",
      });
    }

    if (!genAI) {
      return res.status(500).json({
        error: "GEMINI_API_KEY no está configurada en el archivo .env",
      });
    }

    const { result, modelName } = await generateScanContent(
      stripDataUrl(image),
      mimeType
    );

    const rawText = result.response.text();
    const nutrientes = parseGeminiJson(rawText);
    const evaluacionCAA = evaluarSegunCAA(nutrientes);

    const nombre = nutrientes.nombre || "Producto sin nombre";
    const categoria = await asegurarCategoria(nutrientes.categoria || "Otros");
    const textoTabla = nutrientes.texto_tabla_nutricional || "No se detectó texto nutricional legible.";

    const evaluacion = {
      clasificacion: evaluacionCAA.clasificacion,
      color: evaluacionCAA.color,
      puntuacion: evaluacionCAA.puntuacion,
      resumen: evaluacionCAA.resumen,
    };

    const productoId = await guardarProducto({
      nombre,
      categoria,
      nutrientes,
      evaluacionCAA: evaluacion,
    });

    return res.json({
      success: true,
      modelo: modelName,
      id: productoId,
      nombre,
      categoria,
      textoTabla,
      nutrientes,
      evaluacionCAA: evaluacion,
    });
  } catch (error) {
    console.error("Error en /api/v1/scan:", error);
    return res.status(500).json({
      error: "No se pudo analizar la imagen",
      details: error.message,
    });
  }
});

app.get("/api/v1/categorias", async (req, res) => {
  try {
    const snapshot = await db.collection("categorias").orderBy("nombre").get();
    const categorias = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      fechaCreacion: serializeTimestamp(doc.data().fechaCreacion),
    }));

    return res.json({ success: true, categorias });
  } catch (error) {
    console.error("Error en /api/v1/categorias:", error);
    return res.status(500).json({
      error: "No se pudieron obtener las categorías",
      details: error.message,
    });
  }
});

app.get("/api/v1/productos/ranking", async (req, res) => {
  try {
    const categoria = String(req.query.categoria || "").trim();

    if (!categoria) {
      return res.status(400).json({
        error: "Falta el parámetro categoria. Ejemplo: /api/v1/productos/ranking?categoria=Galletitas",
      });
    }

    const snapshot = await db
      .collection("productos")
      .where("categoria", "==", categoria)
      .get();

    const productos = snapshot.docs
      .map(serializeProducto)
      .sort((a, b) => (b.puntuacion || 0) - (a.puntuacion || 0));

    const masSaludable = productos[0] || null;
    const menosSaludable = productos.length ? productos[productos.length - 1] : null;

    return res.json({
      success: true,
      categoria,
      ranking: productos,
      masSaludable,
      menosSaludable,
    });
  } catch (error) {
    console.error("Error en /api/v1/productos/ranking:", error);
    return res.status(500).json({
      error: "No se pudo obtener el ranking",
      details: error.message,
    });
  }
});

app.get("/api/v1/productos/historial", async (req, res) => {
  try {
    const snapshot = await db
      .collection("productos")
      .orderBy("fechaCreacion", "desc")
      .limit(30)
      .get();

    const productos = snapshot.docs.map(serializeProducto);

    return res.json({ success: true, productos });
  } catch (error) {
    console.error("Error en /api/v1/productos/historial:", error);
    return res.status(500).json({
      error: "No se pudo obtener el historial",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor NutriScan escuchando en http://localhost:${PORT}`);
});