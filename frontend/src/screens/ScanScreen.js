import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { scanProductImage } from '../services/api';

export default function ScanScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectImage = async (useCamera = false) => {
    let result;
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara para escanear etiquetas.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        processImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar la imagen.');
    }
  };

  const processImage = async (base64) => {
    setLoading(true);
    try {
      const response = await scanProductImage(base64);
      setLoading(false);
      
      if (response.success) {
        // Redirige a la pantalla de resultados enviando los datos obtenidos
        navigation.navigate('Result', { data: response });
      } else {
        Alert.alert('Error de análisis', response.error || 'No se pudo analizar el producto.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error de conexión', 'Verifica que el servidor Node.js esté encendido y que la IP en api.js sea correcta.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NutriScan</Text>
      <Text style={styles.subtitle}>Escanea la etiqueta nutricional de un alimento</Text>

      <View style={styles.previewContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <Text style={styles.placeholderText}>Captura o selecciona una foto</Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={() => selectImage(true)}>
            <Text style={styles.buttonText}>📷 Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => selectImage(false)}>
            <Text style={styles.buttonText}>🖼️ Galería</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#8e8e93', textAlign: 'center', marginBottom: 24 },
  previewContainer: { width: 260, height: 260, borderRadius: 20, backgroundColor: '#e5e5ea', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 24 },
  previewImage: { width: '100%', height: '100%' },
  placeholderText: { color: '#8e8e93', fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12 },
  secondaryButton: { backgroundColor: '#34C759' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});