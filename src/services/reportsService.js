const reportsRepository = require('../repositories/reportsRepository');

class ReportsService {
  /**
   * 📊 REPORTE 1: CASOS DETECTADOS
   */
async getDetectedCasesReport(usuarioId, startDate = null, endDate = null, animalId = null, status = null) {
  try {
    // ✅ OBTENER TOTAL GENERAL (SIN FILTRO DE STATUS)
    const { estado: estadoGeneral } = await reportsRepository.getHealthStatusData(
      usuarioId, 
      startDate, 
      endDate,
      animalId,
      null // ❌ SIN filtro de status para obtener el total general
    );

    // ✅ OBTENER DATOS FILTRADOS (CON FILTRO DE STATUS)
    const { estado: estadoFiltrado } = await reportsRepository.getHealthStatusData(
      usuarioId, 
      startDate, 
      endDate,
      animalId,
      status // ✅ CON filtro de status
    );
    
    const totalGeneral = estadoGeneral.length; // ✅ TOTAL DE TODOS LOS ANIMALES (30)
    const totalFiltrado = estadoFiltrado.length; // ✅ TOTAL DEL FILTRO (3)
    
    const animalsWithMastitis = estadoFiltrado.filter(a => a.tiene_mastitis === true).length;
    const healthyAnimals = estadoFiltrado.filter(a => a.tiene_mastitis === false).length;
    const noAnalysisAnimals = estadoFiltrado.filter(a => parseInt(a.total_analisis) === 0).length;

    // ✅ TOP ANIMALES
    const topAnimales = await reportsRepository.getTopAnimals(
      usuarioId,
      status,
      startDate,
      endDate,
      animalId,
      10
    );

    return {
      summary: {
        total_general: totalGeneral, // ✅ NUEVO: Total de todos (30)
        total_animales: totalFiltrado, // ✅ Total del filtro (3)
        con_mastitis: animalsWithMastitis,
        sin_mastitis: healthyAnimals,
        sin_analisis: noAnalysisAnimals,
        porcentaje_mastitis: totalFiltrado > 0 
          ? ((animalsWithMastitis / totalFiltrado) * 100).toFixed(2) 
          : 0,
      },
      estado: estadoFiltrado.map(a => ({
        id: a.id,
        codigo: a.codigo,
        nro_partos: a.nro_partos,
        raza: a.raza,
        estado_sanitario: a.tiene_mastitis === true ? 'Con mastitis' : (a.tiene_mastitis === false ? 'Sin mastitis' : 'Sin análisis'),
        ultima_fecha: a.ultima_fecha_analisis,
        confianza_ultima: a.confianza_ultima ? parseFloat(a.confianza_ultima).toFixed(2) : null,
        proxima_revision: a.proxima_revision,
        total_analisis: parseInt(a.total_analisis) || 0,
      })),
      topAnimales: topAnimales,
    };
  } catch (error) {
    console.error('❌ Error en getDetectedCasesReport:', error.message);
    throw error;
  }
}
  /**
   * 📊 REPORTE 2: PRECISIÓN
   */
  async getPrecisionReport(usuarioId, startDate = null, endDate = null, animalId = null, status = null) {
  try {
    const detalleDiario = await reportsRepository.getPrecisionData(
      usuarioId,
      startDate,
      endDate,
      animalId,
      status
    );

    if (detalleDiario.length === 0) {
      return {
        summary: {
          avg_confianza: 0,
          avg_confianza_mastitis: 0,
          avg_confianza_sin_mastitis: 0,
          total_analysis: 0,
          total_mastitis: 0,
          total_sin_mastitis: 0,
        },
        detalle_diario: [],
      };
    }

    // ✅ CALCULAR PROMEDIOS GENERALES
    const confianzaMastitisValues = detalleDiario
      .map(e => parseFloat(e.confianza_mastitis) || 0)
      .filter(v => v > 0);

    const confianzaSinMastitisValues = detalleDiario
      .map(e => parseFloat(e.confianza_sin_mastitis) || 0)
      .filter(v => v > 0);

    // Promedio general (combinado de mastitis + sin mastitis)
    const allConfianzaValues = [...confianzaMastitisValues, ...confianzaSinMastitisValues];

    const avgConfianza = allConfianzaValues.length > 0
      ? allConfianzaValues.reduce((a, b) => a + b, 0) / allConfianzaValues.length
      : 0;

    const avgConfianzaMastitis = confianzaMastitisValues.length > 0
      ? confianzaMastitisValues.reduce((a, b) => a + b, 0) / confianzaMastitisValues.length
      : 0;

    const avgConfianzaSinMastitis = confianzaSinMastitisValues.length > 0
      ? confianzaSinMastitisValues.reduce((a, b) => a + b, 0) / confianzaSinMastitisValues.length
      : 0;

    const totalAnalysis = detalleDiario.reduce((sum, e) => sum + (parseInt(e.total_analysis) || 0), 0);
    const totalMastitis = detalleDiario.reduce((sum, e) => sum + (parseInt(e.cantidad_mastitis) || 0), 0);
    const totalSinMastitis = detalleDiario.reduce((sum, e) => sum + (parseInt(e.cantidad_sin_mastitis) || 0), 0);

    return {
      summary: {
        avg_confianza: Number(avgConfianza.toFixed(2)),
        avg_confianza_mastitis: Number(avgConfianzaMastitis.toFixed(2)),
        avg_confianza_sin_mastitis: Number(avgConfianzaSinMastitis.toFixed(2)),
        total_analysis: totalAnalysis,
        total_mastitis: totalMastitis,
        total_sin_mastitis: totalSinMastitis,
      },
      detalle_diario: detalleDiario.map(e => ({
        fecha: e.fecha,
        cantidad_mastitis: parseInt(e.cantidad_mastitis) || 0,
        confianza_mastitis: parseFloat(e.confianza_mastitis) || 0,
        cantidad_sin_mastitis: parseInt(e.cantidad_sin_mastitis) || 0,
        confianza_sin_mastitis: parseFloat(e.confianza_sin_mastitis) || 0,
      })),
    };
  } catch (error) {
    console.error('❌ Error en getPrecisionReport:', error.message);
    throw error;
  }
}


    /**
   * 📊 REPORTE 3: TIEMPO DE PROCESAMIENTO (SIN EVOLUCIÓN, SOLO ESTADÍSTICAS)
   */
async getProcessingTimeReport(usuarioId, startDate = null, endDate = null, animalId = null, status = null) {
  try {
    const data = await reportsRepository.getProcessingTimeData(
      usuarioId,
      startDate,
      endDate,
      animalId,
      status
    );

    if (data.length === 0) {
      return {
        summary: {
          avg_processing_time: 0,
          total_analysis: 0,
          total_mastitis: 0,
          total_sin_mastitis: 0,
        },
        by_status: {
          'Con mastitis': {
            avg_processing_time: 0,
            total_analysis: 0,
          },
          'Sin mastitis': {
            avg_processing_time: 0,
            total_analysis: 0,
          },
        },
        by_date: [],
      };
    }

    // ✅ ESTADÍSTICAS GLOBALES
    const allTimes = data.map(e => parseInt(e.processing_time_ms) || 0);
    const avgTime = Math.round(allTimes.reduce((a, b) => a + b) / allTimes.length);
    const totalAnalysis = data.length;

    // ✅ ESTADÍSTICAS POR ESTADO (CON/SIN MASTITIS)
    const conMastitis = data.filter(e => e.mastitis_detected === true);
    const sinMastitis = data.filter(e => e.mastitis_detected === false);

    const avgConMastitis = conMastitis.length > 0
      ? Math.round(conMastitis.reduce((sum, e) => sum + (parseInt(e.processing_time_ms) || 0), 0) / conMastitis.length)
      : 0;

    const avgSinMastitis = sinMastitis.length > 0
      ? Math.round(sinMastitis.reduce((sum, e) => sum + (parseInt(e.processing_time_ms) || 0), 0) / sinMastitis.length)
      : 0;

    // ✅ AGRUPAR POR FECHA
    const byDateMap = new Map();
    data.forEach(e => {
      const fecha = new Date(e.fecha).toLocaleDateString('en-CA');
      if (!byDateMap.has(fecha)) {
        byDateMap.set(fecha, []);
      }
      byDateMap.get(fecha).push(parseInt(e.processing_time_ms) || 0);
    });

    const by_date = Array.from(byDateMap.entries()).map(([fecha, times]) => ({
      fecha,
      total_analysis: times.length,
      avg_processing_time_ms: Math.round(times.reduce((a, b) => a + b) / times.length),
    }));

    return {
      summary: {
        avg_processing_time: avgTime,
        total_analysis: totalAnalysis,
        total_mastitis: conMastitis.length,
        total_sin_mastitis: sinMastitis.length,
      },
      by_status: {
        'Con mastitis': {
          avg_processing_time: avgConMastitis,
          total_analysis: conMastitis.length,
        },
        'Sin mastitis': {
          avg_processing_time: avgSinMastitis,
          total_analysis: sinMastitis.length,
        },
      },
      by_date,
    };
  } catch (error) {
    console.error('❌ Error en getProcessingTimeReport:', error.message);
    throw error;
  }
}
}

module.exports = new ReportsService();