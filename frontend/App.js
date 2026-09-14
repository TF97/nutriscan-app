import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView, Alert, SafeAreaView, StatusBar } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { scanProductImage, getCategorias, getRanking, getHistorial } from './src/services/api'; 

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoData, setPhotoData] = useState(null); 
  const [analysisResult, setAnalysisResult] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('escaner'); // 'escaner' | 'ranking' | 'historial'
  
  // Estados para Ranking e Historial
  const [categorias, setCategorias] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [rankingList, setRankingList] = useState([]);
  const [historialList, setHistorialList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const cameraRef = useRef(null);

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    const res = await getCategorias();
    if (res?.success && res?.categorias) {
      setCategorias(res.categorias);
    }
  };

  const cargarRanking = async (cat = '') => {
    setLoadingList(true);
    setSelectedCategory(cat);
    const res = await getRanking(cat);
    if (res?.success) {
      setRankingList(res.productos || res.data || []);
    }
    setLoadingList(false);
  };

  const cargarHistorial = async () => {
    setLoadingList(true);
    const res = await getHistorial();
    if (res?.success) {
      setHistorialList(res.productos || res.data || []);
    }
    setLoadingList(false);
  };

  const resetToHome = () => {
    setPhotoData(null);
    setAnalysisResult(null);
    setShowCamera(false);
    setActiveTab('escaner');
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.subtitle}>Necesitamos acceso a la cámara para fotografiar la tabla nutricional.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder Permiso</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !loading) {
      try {
        setLoading(true);
        const options = { quality: 0.85, base64: true, skipProcessing: false };
        const photo = await cameraRef.current.takePictureAsync(options);
        setPhotoData(photo);
        setAnalysisResult(null); 
        setShowCamera(false);
      } catch (error) {
        Alert.alert("Error", "No se pudo tomar la fotografía.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!photoData?.base64) return;
    try {
      setLoading(true);
      const resultado = await scanProductImage(photoData.base64);
      if (resultado?.success) {
        setAnalysisResult(resultado);
      } else {
        Alert.alert("Error de análisis", resultado?.error || "No se pudo analizar la imagen.");
      }
    } catch (error) {
      Alert.alert("Error de conexión", "Verifica la conexión con el servidor Node.js.");
    } finally {
      setLoading(false);
    }
  };

  const renderResumenCAA = (resumen) => {
    if (!resumen) return null;
    if (typeof resumen === 'string') return <Text style={styles.evaluationSummary}>{resumen}</Text>;
    if (Array.isArray(resumen)) {
      return resumen.map((item, index) => {
        const textoItem = typeof item === 'object' ? (item.texto || item.mensaje || `${item.nutriente || ''}: ${item.tipo || ''}`) : String(item);
        return <Text key={index} style={styles.evaluationSummaryItem}>• {textoItem}</Text>;
      });
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* BARRA SUPERIOR DE NAVEGACIÓN (CON MARGEN SUPERIOR CORREGIDO) */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.homeButton} onPress={resetToHome}>
          <Text style={styles.homeButtonText}>🏠 Inicio</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>NutriScan 🥗</Text>
        <View style={{ width: 70 }} /> 
      </View>

      {/* TABS DE SECCIONES */}
      {!showCamera && (
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'escaner' && styles.activeTab]}
            onPress={() => setActiveTab('escaner')}
          >
            <Text style={[styles.tabText, activeTab === 'escaner' && styles.activeTabText]}>📷 Escáner</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'ranking' && styles.activeTab]}
            onPress={() => { setActiveTab('ranking'); cargarRanking(selectedCategory); }}
          >
            <Text style={[styles.tabText, activeTab === 'ranking' && styles.activeTabText]}>🏆 Ranking</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'historial' && styles.activeTab]}
            onPress={() => { setActiveTab('historial'); cargarHistorial(); }}
          >
            <Text style={[styles.tabText, activeTab === 'historial' && styles.activeTabText]}>📜 Historial</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PANTALLA CÁMARA (CORREGIDO: OVERLAY FUERA DE CAMERAVIEW) */}
      {showCamera ? (
        <View style={styles.cameraContainer}>
          <CameraView style={StyleSheet.absoluteFillObject} facing="back" ref={cameraRef} />

          {/* Superposición colocada afuera del CameraView */}
          <View style={styles.cameraOverlay} pointerEvents="box-none">
            <View style={styles.scanFrame}>
              <Text style={styles.frameText}>Centrá la tabla nutricional aquí</Text>
            </View>
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={loading}>
              {loading ? <ActivityIndicator color="#007AFF" size="large" /> : <View style={styles.innerCaptureButton} />}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* SECCIÓN ESCÁNER */}
          {activeTab === 'escaner' && (
            <View style={styles.sectionContainer}>
              {photoData ? (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Captura lista para analizar:</Text>
                  <Image source={{ uri: photoData.uri }} style={styles.previewImage} />
                  
                  <TouchableOpacity style={[styles.button, styles.analyzeButton]} onPress={handleAnalyze} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>⚡ Analizar Cuadro Nutricional</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.secondaryButton} onPress={() => { setPhotoData(null); setAnalysisResult(null); }}>
                    <Text style={styles.secondaryButtonText}>🔄 Descartar foto</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {analysisResult && (
                <View style={styles.resultCard}>
                  <View style={styles.headerRow}>
                    <Text style={styles.productName}>{analysisResult.nombre}</Text>
                    <Text style={styles.categoryBadge}>{analysisResult.categoria}</Text>
                  </View>

                  {analysisResult.evaluacionCAA && (
                    <View style={[styles.evaluationBox, { borderColor: analysisResult.evaluacionCAA.color || '#007AFF' }]}>
                      <Text style={styles.evaluationTitle}>Clasificación: {analysisResult.evaluacionCAA.clasificacion}</Text>
                      <View style={styles.resumenContainer}>{renderResumenCAA(analysisResult.evaluacionCAA.resumen)}</View>
                    </View>
                  )}

                  <Text style={styles.sectionTitle}>📊 Nutrientes (por 100g):</Text>
                  {analysisResult.nutrientes ? (
                    <View style={styles.tableContainer}>
                      <View style={styles.tableRow}><Text style={styles.nutrientLabel}>Proteínas</Text><Text style={styles.nutrientValue}>{analysisResult.nutrientes.proteinas_g} g</Text></View>
                      <View style={styles.tableRow}><Text style={styles.nutrientLabel}>Carbohidratos simples</Text><Text style={styles.nutrientValue}>{analysisResult.nutrientes.carbohidratos_simples_g} g</Text></View>
                      <View style={styles.tableRow}><Text style={styles.nutrientLabel}>Fibra</Text><Text style={styles.nutrientValue}>{analysisResult.nutrientes.fibra_g} g</Text></View>
                      <View style={styles.tableRow}><Text style={styles.nutrientLabel}>Sodio</Text><Text style={styles.nutrientValue}>{analysisResult.nutrientes.sodio_mg} mg</Text></View>
                      {analysisResult.nutrientes.grasas && (
                        <>
                          <View style={styles.tableRow}><Text style={styles.nutrientLabel}>Grasas Saturadas</Text><Text style={styles.nutrientValue}>{analysisResult.nutrientes.grasas.saturadas_g} g</Text></View>
                          <View style={styles.tableRow}><Text style={styles.nutrientLabel}>Grasas Trans</Text><Text style={styles.nutrientValue}>{analysisResult.nutrientes.grasas.trans_g} g</Text></View>
                        </>
                      )}
                      <View style={styles.tableRow}><Text style={styles.nutrientLabel}>Calcio</Text><Text style={styles.nutrientValue}>{analysisResult.nutrientes.calcio_mg} mg</Text></View>
                    </View>
                  ) : <Text style={styles.resultText}>No se detectaron nutrientes específicos.</Text>}

                  <TouchableOpacity style={styles.resetButton} onPress={resetToHome}>
                    <Text style={styles.buttonText}>📸 Escanear otro producto</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!photoData && !analysisResult && (
                <View style={styles.homeBox}>
                  <Text style={styles.homeWelcome}>¡Bienvenido a NutriScan!</Text>
                  <Text style={styles.subtitle}>Escaneá la información nutricional de cualquier empaque para evaluar su calidad según el CAA.</Text>
                  <TouchableOpacity style={styles.button} onPress={() => setShowCamera(true)}>
                    <Text style={styles.buttonText}>📸 Fotografiar Tabla Nutricional</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* SECCIÓN RANKING (A PRUEBA DE ERRORES) */}
{activeTab === 'ranking' && (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionHeading}>🏆 Ranking Nutricional por Categoría</Text>
    
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
      <TouchableOpacity 
        style={[styles.chip, selectedCategory === '' && styles.activeChip]} 
        onPress={() => cargarRanking('')}
      >
        <Text style={[styles.chipText, selectedCategory === '' && styles.activeChipText]}>Todas</Text>
      </TouchableOpacity>
      {categorias.map((cat, idx) => (
        <TouchableOpacity 
          key={idx} 
          style={[styles.chip, selectedCategory === cat && styles.activeChip]} 
          onPress={() => cargarRanking(cat)}
        >
          <Text style={[styles.chipText, selectedCategory === cat && styles.activeChipText]}>{cat}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    {loadingList ? (
      <ActivityIndicator color="#007AFF" size="large" style={{ marginTop: 20 }} />
    ) : rankingList.length > 0 ? (
      rankingList.map((item, index) => {
        // Validación segura de propiedades
        const nombreProd = typeof item === 'string' ? item : (item.nombre || item.id || `Producto ${index + 1}`);
        const catProd = typeof item === 'object' ? (item.categoria || 'General') : 'General';
        
        // Extracción segura de la clasificación CAA
        let clasificacionText = null;
        let badgeColor = '#34C759';

        if (item.evaluacionCAA) {
          if (typeof item.evaluacionCAA === 'string') {
            clasificacionText = item.evaluacionCAA;
          } else if (typeof item.evaluacionCAA === 'object') {
            clasificacionText = item.evaluacionCAA.clasificacion || null;
            badgeColor = item.evaluacionCAA.color || badgeColor;
          }
        }

        return (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>#{index + 1}</Text>
              <Text style={styles.itemTitle}>{nombreProd}</Text>
            </View>
            <Text style={styles.itemCategory}>Categoría: {catProd}</Text>
            {clasificacionText && (
              <View style={[styles.miniBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.miniBadgeText}>{clasificacionText}</Text>
              </View>
            )}
          </View>
        );
      })
    ) : (
      <Text style={styles.emptyText}>No hay productos registrados en esta categoría.</Text>
    )}
  </View>
)}

          {/* SECCIÓN HISTORIAL (CORREGIDO MANEJO DE OBJETOS) */}
          {activeTab === 'historial' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>📜 Productos Escaneados Recientemente</Text>
              {loadingList ? (
                <ActivityIndicator color="#007AFF" size="large" style={{ marginTop: 20 }} />
              ) : historialList.length > 0 ? (
                historialList.map((item, index) => {
                  const nombreProd = typeof item === 'string' ? item : (item.nombre || item.id || `Escaneo #${index + 1}`);
                  const catProd = typeof item === 'object' ? item.categoria : 'General';
                  const fecha = typeof item === 'object' && item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleDateString() : null;

                  return (
                    <View key={index} style={styles.itemCard}>
                      <Text style={styles.itemTitle}>{nombreProd}</Text>
                      <Text style={styles.itemCategory}>Categoría: {catProd}</Text>
                      {fecha && <Text style={styles.dateText}>Escaneado: {fecha}</Text>}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>Aún no has escaneado productos en esta sesión.</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollContainer: { flexGrow: 1, padding: 16 },
  
  /* BARRA NAVEGACIÓN SUPERIOR CON ESPACIO PARA STATUS BAR */
  navBar: { 
    paddingTop: 45, 
    paddingBottom: 14, 
    backgroundColor: '#ffffff', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justify: 'space-between', 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e5ea',
    elevation: 2
  },
  homeButton: { backgroundColor: '#e5e5ea', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  homeButtonText: { fontSize: 14, fontWeight: '600', color: '#1c1c1e' },
  navTitle: { fontSize: 20, fontWeight: 'bold', color: '#1c1c1e' },

  /* TABS */
  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e5ea' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#8e8e93', fontWeight: '500' },
  activeTabText: { color: '#007AFF', fontWeight: 'bold' },

  /* CÁMARA TRANSPARENTE */
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: '82%', height: '52%', borderWidth: 2, borderColor: '#34C759', borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  frameText: { color: '#fff', backgroundColor: 'rgba(0,0,0,0.65)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, fontSize: 13 },
  controlsContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  closeButton: { backgroundColor: '#FF3B30', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  captureButton: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  innerCaptureButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },

  /* ESCÁNER Y VISTA PREVIA */
  sectionContainer: { width: '100%', alignItems: 'center' },
  homeBox: { width: '100%', alignItems: 'center', marginTop: 30, padding: 20 },
  homeWelcome: { fontSize: 22, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#8e8e93', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, width: '100%', alignItems: 'center', marginVertical: 8 },
  analyzeButton: { backgroundColor: '#34C759' },
  resetButton: { backgroundColor: '#007AFF', marginTop: 15, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  secondaryButton: { paddingVertical: 10, marginTop: 6 },
  secondaryButtonText: { color: '#FF3B30', fontWeight: '600' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  previewContainer: { width: '100%', alignItems: 'center', marginVertical: 10 },
  previewTitle: { fontSize: 14, color: '#8e8e93', marginBottom: 8 },
  previewImage: { width: 240, height: 280, borderRadius: 12, resizeMode: 'cover' },

  /* RESULTADOS */
  resultCard: { width: '100%', backgroundColor: '#ffffff', borderRadius: 16, padding: 18, marginVertical: 10, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  productName: { fontSize: 20, fontWeight: 'bold', color: '#1c1c1e', flex: 1 },
  categoryBadge: { backgroundColor: '#e5e5ea', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, fontSize: 12, fontWeight: '600', color: '#3a3a3c' },
  evaluationBox: { borderWidth: 2, borderRadius: 12, padding: 12, marginBottom: 16, backgroundColor: '#f9f9fb' },
  evaluationTitle: { fontSize: 15, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 6 },
  resumenContainer: { marginTop: 4 },
  evaluationSummary: { fontSize: 13, color: '#636366', lineHeight: 18 },
  evaluationSummaryItem: { fontSize: 13, color: '#3a3a3c', lineHeight: 18, marginBottom: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginBottom: 10 },
  tableContainer: { backgroundColor: '#f2f2f7', borderRadius: 12, paddingHorizontal: 12 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e5ea' },
  nutrientLabel: { fontSize: 14, color: '#3a3a3c', fontWeight: '500' },
  nutrientValue: { fontSize: 14, color: '#1c1c1e', fontWeight: 'bold' },
  resultText: { fontSize: 14, color: '#333' },

  /* RANKING Y SCROLL */
  sectionHeading: { fontSize: 18, fontWeight: 'bold', color: '#1c1c1e', marginVertical: 12, alignSelf: 'flex-start' },
  categoriesScroll: { flexDirection: 'row', marginBottom: 16, width: '100%' },
  chip: { backgroundColor: '#e5e5ea', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, height: 36 },
  activeChip: { backgroundColor: '#007AFF' },
  chipText: { color: '#3a3a3c', fontWeight: '600', fontSize: 13 },
  activeChipText: { color: '#ffffff' },
  itemCard: { width: '100%', backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  itemNumber: { fontSize: 16, fontWeight: 'bold', color: '#007AFF', marginRight: 8 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#1c1c1e', flex: 1 },
  itemCategory: { fontSize: 13, color: '#8e8e93', marginTop: 2 },
  dateText: { fontSize: 12, color: '#aeaeb2', marginTop: 4 },
  miniBadge: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, marginTop: 8 },
  miniBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyText: { color: '#8e8e93', marginTop: 20, textAlign: 'center' }
});