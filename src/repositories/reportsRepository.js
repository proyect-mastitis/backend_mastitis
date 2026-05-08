const pool = require('../config/db');

class ReportsRepository {
  /**
   * REPORTE 1: DATOS DE CASOS
   */
async getHealthStatusData(usuarioId, startDate = null, endDate = null, animalId = null, status = null) {
  try {
    // ✅ ESTADO ACTUAL - SOLO EL ÚLTIMO ANÁLISIS POR ANIMAL
    let query = `
      SELECT 
        a.id,
        a.codigo,
        a.nro_partos,
        a.raza,
        a.usuario_id,
        COALESCE(MAX(an.fecha), NULL) as ultima_fecha_analisis,
        CASE 
          WHEN MAX(an.fecha) IS NULL THEN NULL
          ELSE (array_agg(an.mastitis_detected ORDER BY an.fecha DESC))[1]
        END as tiene_mastitis,
        MAX(an.confianza) as confianza_ultima,
        COALESCE(MAX(an.proxima_revision), NULL) as proxima_revision,
        COUNT(an.id) as total_analisis
      FROM animales a
      LEFT JOIN analisis an ON a.id = an.animal_id AND an.is_valid = TRUE
      WHERE a.usuario_id = $1
    `;
    
    const params = [usuarioId];
    let paramCount = 2;

    if (startDate && endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      
      query += ` AND an.fecha >= $${paramCount} AND an.fecha < $${paramCount + 1}`;
      params.push(startDate, endDatePlusOne);
      paramCount += 2;
    }

    if (animalId) {
      query += ` AND a.id = $${paramCount}`;
      params.push(animalId);
      paramCount++;
    }

    query += ` GROUP BY a.id, a.codigo, a.nro_partos, a.raza, a.usuario_id`;

    if (status && status !== 'Todos') {
      if (status === 'Con mastitis') {
        query += ` HAVING (array_agg(an.mastitis_detected ORDER BY an.fecha DESC))[1] = TRUE`;
      } else if (status === 'Sin mastitis') {
        query += ` HAVING (array_agg(an.mastitis_detected ORDER BY an.fecha DESC))[1] = FALSE`;
      } else if (status === 'Sin análisis') {
        query += ` HAVING MAX(an.fecha) IS NULL`;
      }
    }

    query += ` ORDER BY a.codigo ASC`;

    const resultEstado = await pool.query(query, params);

    return {
      estado: resultEstado.rows,
    };
  } catch (error) {
    console.error('❌ Error en getHealthStatusData:', error.message);
    throw error;
  }
}

//  NUEVA FUNCIÓN PARA TOP ANIMALES
async getTopAnimals(usuarioId, status = null, startDate = null, endDate = null, animalId = null, limit = 10) {
  try {
    let query = `
      SELECT 
        a.id,
        a.codigo,
        a.raza,
        CAST(COUNT(DISTINCT CASE WHEN an.mastitis_detected = TRUE THEN an.id END) AS INTEGER) as casos_mastitis,
        CAST(COUNT(DISTINCT CASE WHEN an.mastitis_detected = FALSE THEN an.id END) AS INTEGER) as casos_sanos,
        CAST(COUNT(DISTINCT an.id) AS INTEGER) as total_casos
      FROM animales a
      LEFT JOIN analisis an ON a.id = an.animal_id AND an.is_valid = TRUE
      WHERE a.usuario_id = $1
    `;

    const params = [usuarioId];
    let paramCount = 2;

    if (startDate && endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      
      query += ` AND an.fecha >= $${paramCount} AND an.fecha < $${paramCount + 1}`;
      params.push(startDate, endDatePlusOne);
      paramCount += 2;
    }

    if (animalId) {
      query += ` AND a.id = $${paramCount}`;
      params.push(animalId);
      paramCount++;
    }

    query += ` GROUP BY a.id, a.codigo, a.raza`;

    // ✅ FILTRAR Y ORDENAR SEGÚN ESTADO
    if (status === 'Con mastitis') {
      query += ` HAVING COUNT(DISTINCT CASE WHEN an.mastitis_detected = TRUE THEN an.id END) > 0
                 ORDER BY casos_mastitis DESC`;
    } else if (status === 'Sin mastitis') {
      query += ` HAVING COUNT(DISTINCT CASE WHEN an.mastitis_detected = FALSE THEN an.id END) > 0
                 ORDER BY casos_sanos DESC`;
    } else if (status === 'Sin análisis') {
      query += ` HAVING COUNT(DISTINCT an.id) = 0
                 ORDER BY a.codigo ASC`;
    } else {
      query += ` HAVING COUNT(DISTINCT an.id) > 0
                 ORDER BY total_casos DESC`;
    }

    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('❌ Error en getTopAnimals:', error.message);
    throw error;
  }
}

  /**
   * REPORTE 2: DATOS DE PRECISIÓN (CORREGIDO)
   */
 async getPrecisionData(usuarioId, startDate = null, endDate = null, animalId = null, status = null) {
  try {
    let query = `
      SELECT 
        DATE(an.fecha)::TEXT as fecha,
        COUNT(*) as total_analysis,
        COUNT(CASE WHEN an.mastitis_detected = TRUE THEN 1 END) as cantidad_mastitis,
        ROUND(AVG(CASE WHEN an.mastitis_detected = TRUE THEN an.confianza ELSE NULL END)::numeric, 2) as confianza_mastitis,
        COUNT(CASE WHEN an.mastitis_detected = FALSE THEN 1 END) as cantidad_sin_mastitis,
        ROUND(AVG(CASE WHEN an.mastitis_detected = FALSE THEN an.confianza ELSE NULL END)::numeric, 2) as confianza_sin_mastitis
      FROM analisis an
      INNER JOIN animales a ON an.animal_id = a.id
      WHERE a.usuario_id = $1 AND an.is_valid = TRUE
    `;

    const params = [usuarioId];
    let paramCount = 2;

    // Filtro de fecha
    if (startDate && endDate) {
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

      query += ` AND an.fecha >= $${paramCount} AND an.fecha < $${paramCount + 1}`;
      params.push(startDate, endDatePlusOne);
      paramCount += 2;
    }

    // Filtro de animal
    if (animalId) {
      query += ` AND a.id = $${paramCount}`;
      params.push(animalId);
      paramCount++;
    }

    // Filtro de estado
    if (status && status !== 'Todos') {
      if (status === 'Con mastitis') {
        query += ` AND an.mastitis_detected = TRUE`;
      } else if (status === 'Sin mastitis') {
        query += ` AND an.mastitis_detected = FALSE`;
      }
    }

    query += `
      GROUP BY DATE(an.fecha)
      ORDER BY DATE(an.fecha) ASC
    `;

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('❌ Error en getPrecisionData:', error.message);
    throw error;
  }
}
  /**
   * REPORTE 3: DATOS DE TIEMPO (CORREGIDO)
   */
    /**
   * REPORTE 3: DATOS DE TIEMPO (CORREGIDO - SIN EVOLUCIÓN, CON BY_STATUS)
   */
  async getProcessingTimeData(usuarioId, startDate = null, endDate = null, animalId = null, status = null) {
    try {
      let query = `
        SELECT 
          a.codigo,
          an.fecha,
          an.processing_time_ms,
          an.mastitis_detected,
          an.total_uploaded
        FROM analisis an
        INNER JOIN animales a ON an.animal_id = a.id
        WHERE a.usuario_id = $1 AND an.is_valid = TRUE
      `;

      const params = [usuarioId];
      let paramCount = 2;

      // Filtro de fecha
      if (startDate && endDate) {
        const endDatePlusOne = new Date(endDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);

        query += ` AND an.fecha >= $${paramCount} AND an.fecha < $${paramCount + 1}`;
        params.push(startDate, endDatePlusOne);
        paramCount += 2;
      }

      // Filtro de animal
      if (animalId) {
        query += ` AND a.id = $${paramCount}`;
        params.push(animalId);
        paramCount++;
      }

      // Filtro de estado
      if (status && status !== 'Todos') {
        if (status === 'Con mastitis') {
          query += ` AND an.mastitis_detected = TRUE`;
        } else if (status === 'Sin mastitis') {
          query += ` AND an.mastitis_detected = FALSE`;
        }
      }

      query += ` ORDER BY an.fecha ASC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error en getProcessingTimeData:', error.message);
      throw error;
    }
  }
}

module.exports = new ReportsRepository();