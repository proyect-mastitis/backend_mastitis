const pool = require('../config/db');
const Analysis = require('../models/analysisModel');

class AnalysisRepository {
  async create(analysisData) {
    try {
      const result = await pool.query(
        `INSERT INTO analisis(
          animal_id, 
          resultado, 
          confianza, 
          imagenes, 
          is_valid,
          mastitis_detected,
          valid_count,
          total_uploaded,
          processing_time_ms,
          fecha,
          proxima_revision
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          analysisData.animal_id,
          analysisData.resultado,
          analysisData.confianza,
          JSON.stringify(analysisData.imagenes),
          analysisData.is_valid,
          analysisData.mastitis_detected || false,
          analysisData.valid_count || 0,
          analysisData.total_uploaded || 0,
          analysisData.processing_time_ms || 0, // ✅ NUEVO
          analysisData.fecha || new Date(),
          analysisData.proxima_revision || null, // ✅ NUEVO
        ]
      );

      const row = result.rows[0];
      return this._formatAnalysis(row);
    } catch (error) {
      console.error('❌ Error en create:', error.message);
      throw error;
    }
  }

  async findByAnimalId(animal_id) {
    try {
      const result = await pool.query(
        `SELECT 
          id, 
          animal_id, 
          resultado, 
          confianza, 
          imagenes, 
          is_valid,
          mastitis_detected,
          valid_count,
          total_uploaded,
          processing_time_ms,
          fecha,
          proxima_revision
         FROM analisis 
         WHERE animal_id=$1 AND is_valid=TRUE 
         ORDER BY fecha DESC`,
        [animal_id]
      );

      return result.rows.map(row => this._formatAnalysis(row));
    } catch (error) {
      console.error('❌ Error en findByAnimalId:', error.message);
      throw error;
    }
  }

  async findById(id) {
    try {
      const result = await pool.query(
        `SELECT * FROM analisis WHERE id=$1 AND is_valid=TRUE`,
        [id]
      );

      if (!result.rows[0]) return null;
      return this._formatAnalysis(result.rows[0]);
    } catch (error) {
      console.error('❌ Error en findById:', error.message);
      throw error;
    }
  }

  async findFiltered(animal_id, filters) {
    try {
      let query = `SELECT * FROM analisis WHERE animal_id=$1 AND is_valid=TRUE`;
      const params = [animal_id];
      let paramCount = 2;

      if (filters.status && filters.status !== "Todos" && filters.status.trim() !== "") {
        query += ` AND resultado ILIKE $${paramCount}`;
        params.push(`%${filters.status.trim()}%`);
        paramCount++;
      }

      if (filters.search && filters.search.trim() !== "") {
        query += ` AND (animal_id::text ILIKE $${paramCount})`;
        params.push(`%${filters.search.trim()}%`);
        paramCount++;
      }

      query += ` ORDER BY fecha DESC`;

      const result = await pool.query(query, params);
      return result.rows.map(row => this._formatAnalysis(row));
    } catch (error) {
      console.error('❌ Error en findFiltered:', error.message);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await pool.query(
        `DELETE FROM analisis WHERE id=$1 RETURNING *`,
        [id]
      );

      if (!result.rows[0]) return null;
      return this._formatAnalysis(result.rows[0]);
    } catch (error) {
      console.error('❌ Error en delete:', error.message);
      throw error;
    }
  }

  async findAll() {
    try {
      const result = await pool.query(
        `SELECT * FROM analisis WHERE is_valid=TRUE ORDER BY fecha DESC`
      );

      return result.rows.map(row => this._formatAnalysis(row));
    } catch (error) {
      console.error('❌ Error en findAll:', error.message);
      throw error;
    }
  }

  async getStats(animal_id = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_analysis,
          SUM(CASE WHEN mastitis_detected = TRUE THEN 1 ELSE 0 END) as total_with_mastitis,
          SUM(CASE WHEN mastitis_detected = FALSE THEN 1 ELSE 0 END) as total_without_mastitis,
          AVG(confianza) as avg_confidence,
          AVG(processing_time_ms) as avg_processing_time
        FROM analisis 
        WHERE is_valid=TRUE
      `;

      const params = [];

      if (animal_id) {
        query += ` AND animal_id=$1`;
        params.push(animal_id);
      }

      const result = await pool.query(query, params);
      const row = result.rows[0];

      return {
        total_analysis: parseInt(row.total_analysis) || 0,
        total_with_mastitis: parseInt(row.total_with_mastitis) || 0,
        total_without_mastitis: parseInt(row.total_without_mastitis) || 0,
        avg_confidence: parseFloat(row.avg_confidence) || 0,
        avg_processing_time: parseInt(row.avg_processing_time) || 0, // ✅ NUEVO
        mastitis_percentage:
          row.total_analysis > 0
            ? ((parseInt(row.total_with_mastitis) / parseInt(row.total_analysis)) * 100).toFixed(2)
            : 0,
      };
    } catch (error) {
      console.error('❌ Error en getStats:', error.message);
      throw error;
    }
  }

  _formatAnalysis(row) {
    if (!row) return null;

    return {
      id: row.id,
      animal_id: row.animal_id,
      resultado: row.resultado,
      confianza: parseFloat(row.confianza),
      imagenes:
        typeof row.imagenes === 'string'
          ? JSON.parse(row.imagenes)
          : row.imagenes || [],
      is_valid: row.is_valid,
      mastitis_detected: row.mastitis_detected || false,
      valid_count: row.valid_count || 0,
      total_uploaded: row.total_uploaded || 0,
      processing_time_ms: row.processing_time_ms || 0, // ✅ NUEVO
      fecha: row.fecha,
      proxima_revision: row.proxima_revision, // ✅ NUEVO
    };
  }
}

module.exports = new AnalysisRepository();