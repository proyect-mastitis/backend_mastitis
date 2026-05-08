const analysisService = require('../services/analysisService');

class AnalysisController {
  /**
   * POST /api/analysis/analyze
   */
  async analyzeAnimal(req, res) {
    try {
      const { animal_id } = req.body;

      if (!animal_id) {
        return res.status(400).json({
          success: false,
          error: 'animal_id es requerido'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Debe subir al menos una imagen'
        });
      }

      console.log(`📸 Analizando ${req.files.length} imágenes para animal ${animal_id}`);

      const result = await analysisService.analyzeAnimal(animal_id, req.files);

      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('❌ Error en controller:', error.message);

      // ✅ MEJORADO: Manejo robusto de errores
      try {
        const parsed = JSON.parse(error.message);
        
        return res.status(400).json({
          success: false,
          message: parsed.message,
          details: Array.isArray(parsed.details) ? parsed.details : []
        });
      } catch {
        // Si no es JSON, devolver el error como está
        return res.status(500).json({
          success: false,
          error: error.message || 'Error interno del servidor'
        });
      }
    }
  }

  /**
   * GET /api/analysis/history/:animal_id
   */
  async getHistory(req, res) {
    try {
      const { animal_id } = req.params;

      if (!animal_id) {
        return res.status(400).json({
          success: false,
          error: 'animal_id es requerido'
        });
      }

      const history = await analysisService.getHistoryByAnimal(animal_id);

      return res.status(200).json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/analysis/history-filtered/:animal_id
   */
  async getHistoryFiltered(req, res) {
    try {
      const { animal_id } = req.params;
      const { status, search } = req.query;

      if (!animal_id) {
        return res.status(400).json({
          success: false,
          error: 'animal_id es requerido'
        });
      }

      const history = await analysisService.getHistoryFiltered(animal_id, {
        status: status || null,
        search: search || null,
      });

      return res.status(200).json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('❌ Error en filtrado:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/analysis/analysis/:id
   */
  async deleteAnalysis(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'id es requerido'
        });
      }

      const deleted = await analysisService.deleteAnalysis(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Análisis no encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Análisis eliminado exitosamente',
        data: deleted
      });

    } catch (error) {
      console.error('❌ Error eliminando análisis:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AnalysisController();