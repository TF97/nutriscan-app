require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("=== DIAGNÓSTICO NUTRISCAN ===");
console.log("Clave detectada:", process.env.GEMINI_API_KEY ? "SÍ (longitud: " + process.env.GEMINI_API_KEY.length + ")" : "NO SE ENCONTRÓ GEMINI_API_KEY");

if (!process.env.GEMINI_API_KEY) {
  console.error("ERROR: Revisa que el archivo .env esté dentro de la carpeta /backend");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function probarModelo(nombreModelo) {
  try {
    console.log(`\nProbando modelo: ${nombreModelo}...`);
    const model = genAI.getGenerativeModel({ model: nombreModelo });
    const result = await model.generateContent("Responde solo la palabra 'FUNCIONA'");
    console.log(`✅ ¡ÉXITO con ${nombreModelo}! Respuesta:`, result.response.text().trim());
    return true;
  } catch (error) {
    console.error(`❌ Falló ${nombreModelo}:`, error.message || error);
    return false;
  }
}

async function run() {
  const modelos = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  for (const m of modelos) {
    const ok = await probarModelo(m);
    if (ok) break;
  }
}

run();