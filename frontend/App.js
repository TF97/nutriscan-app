import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

// Importamos la función que conecta con tu backend (ajustá la ruta si tu api.js está en /src/services/api)
//import { scanProductImage } from './api';
import { scanProductImage } from './src/services/api'; 

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoData, setPhotoData] = useState(null); // Guarda { uri, base64 }
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Necesitamos acceso a la cámara para fotografiar la tabla nutricional.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Tomar la foto enfocado en el cuadro nutricional
  const takePicture = async () => {
    if (cameraRef.current && !loading) {
      try {
        setLoading(true);
        const options = { quality: 0.85, base64: true, skipProcessing: false };
        const photo = await cameraRef.current.takePictureAsync(options);
        
        setPhotoData(photo);
        setShowCamera(false);
      } catch (error) {
        Alert.alert("Error", "No se pudo tomar la fotografía. Intentalo de nuevo.");
        console.error("Error al capturar foto:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Enviar la imagen capturada en base64 al backend
  const handleAnalyze = async () => {
    if (!photoData?.base64) {
      Alert.alert("Error", "No hay imagen disponible para analizar.");
      return;
    }
    try {
      setLoading(true);
      const resultado = await scanProductImage(photoData.base64);
      console.log("Respuesta del servidor:", resultado);
      Alert.alert("Éxito", "El servidor recibió y procesó la imagen correctamente.");
    } catch (error) {
      console.error("Error al enviar foto:", error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor en 192.168.0.17:3000");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!showCamera ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>NutriScan App 🥗</Text>
          <Text style={styles.subtitle}>Escáner de Información Nutricional</Text>

          {photoData ? (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Captura lista para analizar:</Text>
              <Image source={{ uri: photoData.uri }} style={styles.previewImage} />
              
              <TouchableOpacity 
                style={[styles.button, styles.analyzeButton]}
                onPress={handleAnalyze}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>⚡ Analizar Cuadro Nutricional</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity 
            style={styles.button}
            onPress={() => setShowCamera(true)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {photoData ? "📸 Tomar otra foto" : "📸 Fotografiar Tabla Nutricional"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.cameraContainer}>
          {/* Cámara limpia sin hijos adentro */}
          <CameraView 
            style={StyleSheet.absoluteFillObject} 
            facing="back" 
            ref={cameraRef}
            animateShutter={true}
          />

          {/* Guía visual overlay posicionado en capa superior */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.scanFrame}>
              <Text style={styles.frameText}>Centrá la tabla nutricional dentro del cuadro</Text>
            </View>
          </View>

          {/* Controles de la cámara */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowCamera(false)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.captureButton} 
              onPress={takePicture} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#007AFF" size="large" />
              ) : (
                <View style={styles.innerCaptureButton} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  scrollContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  cameraContainer: { flex: 1, position: 'relative', backgroundColor: '#000' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#8e8e93', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 10, width: '100%', alignItems: 'center' },
  analyzeButton: { backgroundColor: '#34C759', marginTop: 15 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  scanFrame: { width: '85%', height: '55%', borderWidth: 2, borderColor: '#34C759', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  frameText: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, fontSize: 13, textAlign: 'center' },
  controlsContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  closeButton: { backgroundColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  captureButton: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  innerCaptureButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  previewContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  previewTitle: { fontSize: 14, color: '#8e8e93', marginBottom: 8 },
  previewImage: { width: 260, height: 320, borderRadius: 12, resizeMode: 'cover' }
});