const fs = require("fs");
const path = require("path");

const IMAGE_PATH = path.join(__dirname, "images", "etiqueta_prueba.jpg");
const SCAN_URL = "http://localhost:3000/api/v1/scan";

async function main() {
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error(`No se encontró la imagen: ${IMAGE_PATH}`);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const base64Data = imageBuffer.toString("base64");

  const response = await fetch(SCAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: base64Data,
      mimeType: "image/jpeg",
    }),
  });

  const result = await response.json();

  console.log("Respuesta del servidor (nutrientes / 100 g + dictamen CAA):");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("Error al probar /api/v1/scan:", error.message);
  process.exit(1);
});
