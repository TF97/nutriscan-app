import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { scanProductImage, getCategorias, getRanking, getHistorial } from './src/services/api';

// Función auxiliar para extraer cadenas de texto sin romper React
const formatSafeText = (val, fallback = '') => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    if (val.nombre && typeof val.nombre === 'string') return val.nombre;
    if (val.titulo && typeof val.titulo === 'string') return val.titulo;
    if (val.texto && typeof val.texto === 'string') return val.texto;
    return fallback;
  }
  return fallback;
};

// Subcomponente de Cámara TRANSPARENTE para ver el producto claramente
const CameraScreen = memo(({ onCapture, onClose, loading }) => {
  const cameraRef = useRef(null);

  const takePicture = async () => {
    if (cameraRef.current && !loading) {
      try {
        const options = { quality: 0.85, base64: true, skipProcessing: false };
        const photo = await cameraRef.current.takePictureAsync(options);
        onCapture(photo);
      } catch (error) {
        Alert.alert('Error', 'No se pudo tomar la fotografía.');
      }
    }
  };

  return (
    <View style={styles.cameraContainer}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back" ref={cameraRef} />
      
      {/* Superposición TRANSPARENTE con bordes nítidos de enfoque */}
      <View style={styles.cameraOverlay} pointerEvents="box-none">
        <View style={styles.transparentScanFrame}>
          <View style={styles.scanGuideCornerTL} />
          <View style={styles.scanGuideCornerTR} />
          <View style={styles.scanGuideCornerBL} />
          <View style={styles.scanGuideCornerBR} />
          <Text style={styles.transparentGuideText}>
            Enfocá la tabla nutricional
          </Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#007AFF" size="large" />
          ) : (
            <View style={styles.innerCaptureButton} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Componentes memoizados para evitar renders pesados en las listas
const RankingItem = memo(({ item, index }) => {
  const nombreProd = formatSafeText(item?.nombre || item, `Producto ${index + 1}`);
  const catProd = formatSafeText(item?.categoria, 'General');
  const clasificacionText = item?.evaluacionCAA?.clasificacion || null;
  const badgeColor = item?.evaluacionCAA?.color || '#059669';

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankBadgeText}>#{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{nombreProd}</Text>
          <Text style={styles.itemCategory}>Categoría: {catProd}</Text>
        </View>
      </View>
      {clasificacionText && (
        <View style={[styles.miniBadge, { backgroundColor: `${badgeColor}22` }]}>
          <Text style={[styles.miniBadgeText, { color: badgeColor }]}>
            {clasificacionText}
          </Text>
        </View>
      )}
    </View>
  );
});

const HistorialItem = memo(({ item, index }) => {
  const nombreProd = formatSafeText(item?.nombre || item, `Escaneo #${index + 1}`);
  const catProd = formatSafeText(item?.categoria, 'General');
  const fecha = item?.fechaCreacion
    ? new Date(item.fechaCreacion).toLocaleDateString()
    : null;

  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemTitle}>{nombreProd}</Text>
      <Text style={styles.itemCategory}>Categoría: {catProd}</Text>
      {fecha && <Text style={styles.dateText}>Escaneado: {fecha}</Text>}
    </View>
  );
});

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const isSmallDevice = windowWidth < 380;
  const isTablet = windowWidth > 600;

  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('escaner');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNutritionalDetails, setShowNutritionalDetails] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [rankingList, setRankingList] = useState([]);
  const [historialList, setHistorialList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const cargarCategorias = async () => {
      try {
        const res = await getCategorias();
        if (isMounted.current && res?.success && Array.isArray(res?.categorias)) {
          setCategorias(res.categorias);
        }
      } catch (e) {
        console.log('Error al cargar categorias', e);
      }
    };

    cargarCategorias();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const cargarRanking = useCallback(async (cat = '') => {
    setLoadingList(true);
    setSelectedCategory(cat);
    try {
      const res = await getRanking(cat);
      if (isMounted.current) {
        if (res?.success) {
          setRankingList(res.productos || res.data || []);
        } else {
          setRankingList([]);
        }
      }
    } catch (e) {
      console.log('Error al cargar ranking:', e);
      if (isMounted.current) setRankingList([]);
    } finally {
      if (isMounted.current) setLoadingList(false);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await getHistorial();
      if (isMounted.current) {
        if (res?.success) {
          setHistorialList(res.productos || res.data || []);
        } else {
          setHistorialList([]);
        }
      }
    } catch (e) {
      console.log('Error al cargar historial:', e);
      if (isMounted.current) setHistorialList([]);
    } finally {
      if (isMounted.current) setLoadingList(false);
    }
  }, []);

  const resetToHome = useCallback(() => {
    setPhotoData(null);
    setAnalysisResult(null);
    setShowCamera(false);
    setActiveTab('escaner');
    setShowNutritionalDetails(false);
  }, []);

  const handleCapturePhoto = useCallback((photo) => {
    setPhotoData(photo);
    setAnalysisResult(null);
    setShowCamera(false);
  }, []);

  const handleAnalyze = async () => {
    if (!photoData?.base64) return;
    try {
      setLoading(true);
      const resultado = await scanProductImage(photoData.base64);
      if (isMounted.current) {
        if (resultado?.success) {
          setAnalysisResult(resultado);
        } else {
          Alert.alert('Error de análisis', resultado?.error || 'No se pudo analizar la imagen.');
        }
      }
    } catch (error) {
      Alert.alert('Error de conexión', 'Verifica la IP y conexión con el servidor Node.js.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const renderResumenCAA = (resumen) => {
    if (!resumen) return null;
    if (typeof resumen === 'string') return <Text style={styles.evaluationSummary}>{resumen}</Text>;
    if (Array.isArray(resumen)) {
      return resumen.map((item, index) => {
        const textoItem =
          typeof item === 'object'
            ? item.texto || item.mensaje || `${item.nutriente || ''}: ${item.tipo || ''}`
            : String(item);
        return (
          <Text key={item.id || index} style={styles.evaluationSummaryItem}>
            • {textoItem}
          </Text>
        );
      });
    }
    return null;
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.subtitle}>
          Necesitamos acceso a la cámara para fotografiar la tabla nutricional.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Conceder Permiso</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const responsivePadding = isSmallDevice ? 12 : isTablet ? 28 : 18;
  const responsiveTitleSize = isSmallDevice ? 18 : isTablet ? 26 : 22;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={[styles.header, { paddingHorizontal: responsivePadding }]}>
        <TouchableOpacity onPress={resetToHome}>
          <Text style={[styles.greeting, { fontSize: responsiveTitleSize }]}>NutriScan 🥗</Text>
          <Text style={styles.subGreeting}>¿Qué analizamos hoy?</Text>
        </TouchableOpacity>

        {!showCamera && (
          <TouchableOpacity
            style={styles.menuTriggerBtn}
            onPress={() => setIsMenuOpen(true)}
          >
            <Text style={styles.menuTriggerText}>⚡ Acciones</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABS DE NAVEGACIÓN */}
      {!showCamera && (
        <View style={[styles.tabContainer, { marginHorizontal: responsivePadding }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'escaner' && styles.activeTab]}
            onPress={() => setActiveTab('escaner')}
          >
            <Text style={[styles.tabText, activeTab === 'escaner' && styles.activeTabText]}>
              🏠 Escáner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'ranking' && styles.activeTab]}
            onPress={() => {
              setActiveTab('ranking');
              cargarRanking(selectedCategory);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'ranking' && styles.activeTabText]}>
              🏆 Ranking
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'historial' && styles.activeTab]}
            onPress={() => {
              setActiveTab('historial');
              cargarHistorial();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'historial' && styles.activeTabText]}>
              📜 Historial
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CÁMARA */}
      {showCamera ? (
        <CameraScreen
          onCapture={handleCapturePhoto}
          onClose={() => setShowCamera(false)}
          loading={loading}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingHorizontal: responsivePadding, maxWidth: isTablet ? 700 : '100%', alignSelf: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* SECCIÓN ESCÁNER */}
          {activeTab === 'escaner' && (
            <View style={styles.sectionContainer}>
              {photoData && !analysisResult && (
                <View style={styles.card}>
                  <Text style={styles.previewTitle}>Captura lista para evaluar:</Text>
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

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setPhotoData(null);
                      setAnalysisResult(null);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>🔄 Descartar foto</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* RESULTADO DEL ANÁLISIS */}
              {analysisResult && (
                <View style={styles.card}>
                  <View style={styles.mainResultBox}>
                    <Text style={styles.productTitle}>
                      {formatSafeText(analysisResult.nombre, 'Producto Escaneado')}
                    </Text>
                    <Text style={styles.productBrand}>
                      Categoría: {formatSafeText(analysisResult.categoria, 'General')}
                    </Text>

                    {analysisResult.evaluacionCAA && (
                      <View
                        style={[
                          styles.healthBadgeLarge,
                          {
                            backgroundColor: analysisResult.evaluacionCAA.color
                              ? `${analysisResult.evaluacionCAA.color}22`
                              : '#D1FAE5',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.healthBadgeLargeText,
                            {
                              color: analysisResult.evaluacionCAA.color || '#059669',
                            },
                          ]}
                        >
                          {analysisResult.evaluacionCAA.clasificacion || 'Evaluación de Salud'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* BOTÓN DESPLEGABLE */}
                  <TouchableOpacity
                    style={styles.accordionButton}
                    activeOpacity={0.7}
                    onPress={() => setShowNutritionalDetails(!showNutritionalDetails)}
                  >
                    <Text style={styles.accordionButtonText}>
                      {showNutritionalDetails
                        ? '▲ Ocultar Información Nutricional'
                        : '▼ Ver Información Nutricional Completa'}
                    </Text>
                  </TouchableOpacity>

                  {/* CONTENIDO DESPLEGADO */}
                  {showNutritionalDetails && (
                    <View style={styles.dropdownContent}>
                      {analysisResult.evaluacionCAA && (
                        <View style={[styles.evaluationBox, { marginBottom: 14 }]}>
                          <Text style={styles.nutrientSectionTitle}>📋 Análisis Detallado:</Text>
                          {renderResumenCAA(analysisResult.evaluacionCAA.resumen)}
                        </View>
                      )}

                      <Text style={styles.nutrientSectionTitle}>📊 Tabla Nutricional (Valores):</Text>
                      {analysisResult.nutrientes ? (
                        <View style={styles.tableContainer}>
                          <View style={styles.tableRow}>
                            <Text style={styles.nutrientLabel}>Proteínas</Text>
                            <Text style={styles.nutrientValue}>
                              {analysisResult.nutrientes.proteinas_g ?? '-'} g
                            </Text>
                          </View>
                          <View style={styles.tableRow}>
                            <Text style={styles.nutrientLabel}>Carbohidratos simples</Text>
                            <Text style={styles.nutrientValue}>
                              {analysisResult.nutrientes.carbohidratos_simples_g ?? '-'} g
                            </Text>
                          </View>
                          <View style={styles.tableRow}>
                            <Text style={styles.nutrientLabel}>Fibra</Text>
                            <Text style={styles.nutrientValue}>
                              {analysisResult.nutrientes.fibra_g ?? '-'} g
                            </Text>
                          </View>
                          <View style={styles.tableRow}>
                            <Text style={styles.nutrientLabel}>Sodio</Text>
                            <Text style={styles.nutrientValue}>
                              {analysisResult.nutrientes.sodio_mg ?? '-'} mg
                            </Text>
                          </View>
                          {analysisResult.nutrientes.grasas && (
                            <>
                              <View style={styles.tableRow}>
                                <Text style={styles.nutrientLabel}>Grasas Saturadas</Text>
                                <Text style={styles.nutrientValue}>
                                  {analysisResult.nutrientes.grasas.saturadas_g ?? '-'} g
                                </Text>
                              </View>
                              <View style={styles.tableRow}>
                                <Text style={styles.nutrientLabel}>Grasas Trans</Text>
                                <Text style={styles.nutrientValue}>
                                  {analysisResult.nutrientes.grasas.trans_g ?? '-'} g
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.subtitle}>No se detectaron nutrientes en el análisis.</Text>
                      )}
                    </View>
                  )}

                  <TouchableOpacity style={styles.resetButton} onPress={resetToHome}>
                    <Text style={styles.buttonText}>📸 Escanear otro producto</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* INICIO */}
              {!photoData && !analysisResult && (
                <View style={styles.homeBox}>
                  <Text style={styles.homeWelcome}>¡Bienvenido a NutriScan!</Text>
                  <Text style={styles.subtitle}>
                    Fotografiá la tabla nutricional para evaluar de inmediato si el producto es saludable.
                  </Text>

                  <TouchableOpacity style={styles.button} onPress={() => setShowCamera(true)}>
                    <Text style={styles.buttonText}>📸 Fotografiar Tabla Nutricional</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* RANKING */}
          {activeTab === 'ranking' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>🏆 Ranking Nutricional</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                <TouchableOpacity
                  style={[styles.chip, selectedCategory === '' && styles.activeChip]}
                  onPress={() => cargarRanking('')}
                >
                  <Text style={[styles.chipText, selectedCategory === '' && styles.activeChipText]}>
                    Todas
                  </Text>
                </TouchableOpacity>
                {categorias.map((cat, idx) => {
                  const labelCat = formatSafeText(cat, `Cat ${idx + 1}`);
                  const categoryKey = typeof cat === 'object' && cat.id ? cat.id : `${labelCat}-${idx}`;
                  return (
                    <TouchableOpacity
                      key={categoryKey}
                      style={[styles.chip, selectedCategory === labelCat && styles.activeChip]}
                      onPress={() => cargarRanking(labelCat)}
                    >
                      <Text style={[styles.chipText, selectedCategory === labelCat && styles.activeChipText]}>
                        {labelCat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {loadingList ? (
                <ActivityIndicator color="#0284C7" size="large" style={{ marginTop: 20 }} />
              ) : rankingList.length > 0 ? (
                rankingList.map((item, index) => (
                  <RankingItem key={item.id || item._id || index} item={item} index={index} />
                ))
              ) : (
                <Text style={styles.emptyText}>No hay productos registrados en esta categoría.</Text>
              )}
            </View>
          )}

          {/* HISTORIAL */}
          {activeTab === 'historial' && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>📜 Escaneos Recientes</Text>
              {loadingList ? (
                <ActivityIndicator color="#0284C7" size="large" style={{ marginTop: 20 }} />
              ) : historialList.length > 0 ? (
                historialList.map((item, index) => (
                  <HistorialItem key={item.id || item._id || index} item={item} index={index} />
                ))
              ) : (
                <Text style={styles.emptyText}>Aún no has escaneado productos.</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL ACCIONES */}
      <Modal
        visible={isMenuOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMenuOpen(false)}>
          <View style={styles.menuContainer}>
            <View style={styles.dragIndicator} />
            <Text style={styles.menuTitle}>¿Qué querés hacer?</Text>

            <TouchableOpacity
              style={[styles.menuOption, { backgroundColor: '#E0F2FE' }]}
              onPress={() => {
                setIsMenuOpen(false);
                setActiveTab('escaner');
                setShowCamera(true);
              }}
            >
              <Text style={styles.optionIcon}>📸</Text>
              <View>
                <Text style={styles.optionTitle}>Fotografiar Tabla Nutricional</Text>
                <Text style={styles.optionSub}>Analizar ingredientes y salud del producto</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setIsMenuOpen(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scrollContainer: { paddingVertical: 18, paddingBottom: 40, width: '100%' },

  /* HEADER */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#F8F9FA',
  },
  greeting: { fontWeight: '800', color: '#1E293B' },
  subGreeting: { fontSize: 13, color: '#64748B' },
  menuTriggerBtn: { backgroundColor: '#E0F2FE', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  menuTriggerText: { color: '#0284C7', fontWeight: '700', fontSize: 13 },

  /* TABS */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
    elevation: 1,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#E0F2FE' },
  tabText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  activeTabText: { color: '#0284C7', fontWeight: '700' },

  /* CÁMARA TRANSPARENTE */
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  
  transparentScanFrame: {
    width: '85%',
    height: 320,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  /* ESQUINAS MARCADORAS DE ENFOQUE */
  scanGuideCornerTL: { position: 'absolute', top: -2, left: -2, width: 24, height: 24, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#38BDF8', borderTopLeftRadius: 18 },
  scanGuideCornerTR: { position: 'absolute', top: -2, right: -2, width: 24, height: 24, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#38BDF8', borderTopRightRadius: 18 },
  scanGuideCornerBL: { position: 'absolute', bottom: -2, left: -2, width: 24, height: 24, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#38BDF8', borderBottomLeftRadius: 18 },
  scanGuideCornerBR: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#38BDF8', borderBottomRightRadius: 18 },
  
  transparentGuideText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },

  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  closeButton: { backgroundColor: '#EF4444', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCaptureButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },

  /* TARJETAS */
  sectionContainer: { width: '100%' },
  homeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  homeWelcome: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20 },

  button: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  analyzeButton: { backgroundColor: '#059669', marginTop: 12 },
  resetButton: { backgroundColor: '#0284C7', marginTop: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  secondaryButton: { paddingVertical: 10, marginTop: 4, alignItems: 'center' },
  secondaryButtonText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  mainResultBox: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  productTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  productBrand: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 12 },

  healthBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  healthBadgeLargeText: { fontWeight: '800', fontSize: 16, textAlign: 'center' },

  previewTitle: { fontSize: 14, color: '#64748B', marginBottom: 10, textAlign: 'center' },
  previewImage: { width: '100%', height: 260, borderRadius: 14, resizeMode: 'cover' },

  evaluationBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, width: '100%' },
  evaluationSummary: { fontSize: 13, color: '#334155', lineHeight: 18, textAlign: 'center' },
  evaluationSummaryItem: { fontSize: 13, color: '#334155', lineHeight: 18, marginBottom: 2 },

  /* ACCORDEÓN DESPLEGABLE */
  accordionButton: {
    backgroundColor: '#F0F9FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  accordionButtonText: { color: '#0284C7', fontWeight: '700', fontSize: 14 },
  dropdownContent: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  nutrientSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 10 },
  tableContainer: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12 },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  nutrientLabel: { fontSize: 13, color: '#64748B' },
  nutrientValue: { fontSize: 13, color: '#1E293B', fontWeight: '700' },

  /* RANKING */
  sectionHeading: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginVertical: 12 },
  categoriesScroll: { flexDirection: 'row', marginBottom: 16 },
  chip: { backgroundColor: '#E2E8F0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8 },
  activeChip: { backgroundColor: '#059669' },
  chipText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  activeChipText: { color: '#FFFFFF' },

  itemCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeText: { color: '#D97706', fontWeight: '800', fontSize: 14 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  itemCategory: { fontSize: 12, color: '#64748B', marginTop: 2 },
  dateText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  miniBadge: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, marginTop: 10 },
  miniBadgeText: { fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#94A3B8', marginTop: 20, textAlign: 'center' },

  /* MODAL */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  menuContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  dragIndicator: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  menuTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  menuOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 12 },
  optionIcon: { fontSize: 24, marginRight: 14 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  optionSub: { fontSize: 12, color: '#64748B' },
  closeBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 6 },
  closeBtnText: { color: '#64748B', fontWeight: '600' },
});