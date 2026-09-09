import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
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

  const takePicture = async () => {
    if (cameraRef.current) {
      setLoading(true);
      const options = { quality: 0.8, base64: true };
      const photo = await cameraRef.current.takePictureAsync(options);
      setPhotoUri(photo.uri);
      setShowCamera(false);
      setLoading(false);
      console.log("Foto capturada con éxito:", photo.uri);
    }
  };

  return (
    <View style={styles.container}>
      {!showCamera ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>NutriScan App 🥗</Text>
          <Text style={styles.subtitle}>Análisis de Información Nutricional</Text>

          {photoUri && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Captura actual:</Text>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            </View>
          )}

          <TouchableOpacity 
            style={styles.button}
            onPress={() => setShowCamera(true)}
          >
            <Text style={styles.buttonText}>📸 Fotografiar Tabla Nutricional</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.cameraContainer}>
          {/* Cámara sin componentes adentro */}
          <CameraView style={StyleSheet.absoluteFillObject} facing="back" ref={cameraRef} />

          {/* Capa con la guía de encuadre (posicionada encima de forma absoluta) */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.scanFrame}>
              <Text style={styles.frameText}>Encuadrá aquí el cuadro nutricional</Text>
            </View>
          </View>

          {/* Controles de la cámara (cancelar y tomar foto) */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <View style={styles.innerCaptureButton} />}
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
  cameraContainer: { flex: 1, position: 'relative' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#8e8e93', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  scanFrame: { width: '85%', height: '50%', borderWidth: 2, borderColor: '#007AFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  frameText: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 6, fontSize: 13 },
  controlsContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  closeButton: { backgroundColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  captureButton: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  innerCaptureButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  previewContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  previewTitle: { fontSize: 14, color: '#8e8e93', marginBottom: 8 },
  previewImage: { width: 250, height: 250, borderRadius: 12, resizeMode: 'cover' }
});