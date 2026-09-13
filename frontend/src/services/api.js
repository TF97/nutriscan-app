// Remplace con la IP local de tu PC si pruebas en dispositivo físico (Ej: http://192.168.1.50:3000)
const API_BASE_URL = 'http://192.168.0.17:3000/api/v1';

export const scanProductImage = async (base64Image) => {
  const response = await fetch(`${API_BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: base64Image,
      mimeType: 'image/jpeg'
    })
  });
  return response.json();
};

export const getCategorias = async () => {
  const response = await fetch(`${API_BASE_URL}/categorias`);
  return response.json();
};

export const getRankingByCategoria = async (categoria) => {
  const response = await fetch(`${API_BASE_URL}/productos/ranking?categoria=${encodeURIComponent(categoria)}`);
  return response.json();
};

export const getHistorial = async () => {
  const response = await fetch(`${API_BASE_URL}/productos/historial`);
  return response.json();
};