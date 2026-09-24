const API_BASE_URL = 'http://192.168.0.18:3000/api/v1';

// Escaneo de imagen
export const scanProductImage = async (base64Image, mimeType = 'image/jpeg') => {
  try {
    const response = await fetch(`${API_BASE_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, mimeType }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error al conectar con la API de escaneo:', error);
    throw error;
  }
};

// Obtener categorías disponibles
export const getCategorias = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/categorias`);
    return await response.json();
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return { success: false, categorias: [] };
  }
};

// Obtener ranking de productos por categoría (ordenados por saludabilidad)
export const getRanking = async (categoria = '') => {
  try {
    const url = categoria 
      ? `${API_BASE_URL}/productos/ranking?categoria=${encodeURIComponent(categoria)}` 
      : `${API_BASE_URL}/productos/ranking`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    return { success: false, productos: [] };
  }
};

// Obtener historial de productos analizados
export const getHistorial = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/productos/historial`);
    return await response.json();
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return { success: false, productos: [] };
  }
};