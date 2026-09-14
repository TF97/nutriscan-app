import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function ResultScreen({ route, navigation }) {
  // Obtenemos los datos pasados desde ScanScreen
  const { data } = route.params || {};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Resultado del Análisis</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📄 Tabla Nutricional Detectada</Text>
        <Text style={styles.cardText}>
          {data?.textoTabla || 'No se pudo extraer información de la imagen.'}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Volver a escanear</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f5f7', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 10 },
  cardText: { fontSize: 14, color: '#3c3c43', lineHeight: 22 },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});