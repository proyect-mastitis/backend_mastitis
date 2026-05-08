const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const analysisRepository = require('../repositories/analysisRepository');
const Analysis = require('../models/analysisModel');

const ML_SERVER_URL = process.env.ML_SERVER_URL 
  || 'https://LESLY1-mastitis-ml.hf.space';
class AnalysisService {
  async analyzeAnimal(animalId, files) {
    if (!animalId) throw this._createError('animal_id es requerido');
    if (!files || files.length < 1) throw this._createError('Debe subir al menos 1 imagen');
    if (files.length > 2) throw this._createError('Máximo 2 imágenes permitidas');

    const startTime = Date.now(); // ✅ NUEVO: Capturar tiempo inicio

    const formData = new FormData();
    formData.append('animal_id', animalId);

    for (const file of files) {
      const fileStream = fs.createReadStream(file.path);
      formData.append('files', fileStream, file.originalname);
    }

    try {
      console.log(`📤 Enviando análisis a ${ML_SERVER_URL}/analyze`);

      const response = await axios.post(`${ML_SERVER_URL}/analyze`, formData, {
        headers: formData.getHeaders(),
        timeout: 180000,
      });

      const result = response.data;
      const processingTimeMs = Date.now() - startTime; // ✅ NUEVO: Calcular tiempo procesamiento

      if (!result.is_valid || result.valid_count === 0) {
        throw this._createError(
          result.details?.message || 'Ninguna imagen válida. No se realizó análisis.',
          result.details || []
        );
      }

      console.log(`✅ Análisis completado en ${processingTimeMs}ms: ${result.status}`);

      console.log("📦 Image paths from FastAPI:");
      result.details.forEach((d, i) => {
        console.log(`  [${i}] valid=${d.valid}, image_path=${d.image_path}`);
      });

      // ✅ Descargar y guardar imágenes
      const processedDetails = await Promise.all(
        result.details
          .filter(detail => detail.valid === true)
          .map(async (detail) => {
            let finalImagePath = detail.image_path;

            if (detail.image_path) {
              try {
                const imageFilename = path.basename(detail.image_path);
                const sourceUrl = `${ML_SERVER_URL}${detail.image_path}`;
                const destPath = path.join(__dirname, '../../uploads', imageFilename);

                const uploadsDir = path.join(__dirname, '../../uploads');
                if (!fs.existsSync(uploadsDir)) {
                  fs.mkdirSync(uploadsDir, { recursive: true });
                }

                console.log(`📥 Descargando: ${sourceUrl}`);
                const response = await axios.get(sourceUrl, { 
                  responseType: 'arraybuffer',
                  timeout: 30000
                });
                
                fs.writeFileSync(destPath, response.data);
                console.log(`✅ Guardada: ${destPath}`);

                finalImagePath = `/uploads/${imageFilename}`;
              } catch (err) {
                console.warn(`⚠️ Error: ${err.message}`);
                finalImagePath = detail.image_path;
              }
            }

            return {
              image_position: detail.image_position,
              filename: detail.filename,
              valid: detail.valid,
              status: detail.status,
              mastitis_detected: detail.mastitis_detected,
              confidence: detail.confidence,
              image_path: finalImagePath,
              image_id: detail.image_id,
              image_width: detail.image_width,
              image_height: detail.image_height,
              box: detail.box,
            };
          })
      );

      // ✅ NUEVO: Calcular próxima revisión
      const proximaRevision = this._calculateNextReview(
        new Date(),
        result.mastitis_detected || false
      );

      const analysis = new Analysis(
        null,
        animalId,
        result.status,
        result.confidence,
        processedDetails,
        true,
        result.mastitis_detected || false,
        result.valid_count || 0,
        result.total_uploaded || 0,
        processingTimeMs, // ✅ NUEVO: Pasar tiempo de procesamiento
        new Date(),
        proximaRevision // ✅ NUEVO: Pasar próxima revisión
      );

      const savedAnalysis = await analysisRepository.create(analysis);

      return {
        id: savedAnalysis.id,
        animal_id: savedAnalysis.animal_id,
        status: savedAnalysis.resultado,
        mastitis_detected: savedAnalysis.mastitis_detected,
        confidence: savedAnalysis.confianza,
        analysis_date: savedAnalysis.fecha,
        processing_time_ms: savedAnalysis.processing_time_ms, // ✅ NUEVO
        proxima_revision: savedAnalysis.proxima_revision, // ✅ NUEVO
        is_valid: savedAnalysis.is_valid,
        valid_count: savedAnalysis.valid_count,
        total_uploaded: savedAnalysis.total_uploaded,
        details: savedAnalysis.imagenes,
      };
    } catch (error) {
      console.error('❌ Error en analysisService:', error.message);

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'object' && detail.message) {
          throw this._createError(detail.message, detail.details || []);
        }
        if (typeof detail === 'string') {
          throw this._createError(detail);
        }
      }

      if (error.code === 'ECONNREFUSED') {
        throw this._createError(
          'No se pudo conectar al servidor de análisis ML. Intenta más tarde.'
        );
      }

      throw error;
    } finally {
      if (files && Array.isArray(files)) {
        files.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
            } catch (e) {
              console.warn(`⚠️ No se pudo eliminar ${file.path}:`, e.message);
            }
          }
        });
      }
    }
  }

  // ✅ NUEVO: Calcular próxima revisión
  _calculateNextReview(analysisDate, isMastitis) {
    const nextDate = new Date(analysisDate);
    if (isMastitis) {
      nextDate.setDate(nextDate.getDate() + 3); // 3 días para mastitis
    } else {
      nextDate.setDate(nextDate.getDate() + 15); // 15 días para normal
    }
    return nextDate;
  }

  async getHistoryByAnimal(animalId) {
    if (!animalId) throw this._createError('animal_id es requerido');
    return await analysisRepository.findByAnimalId(animalId);
  }

  async getHistoryFiltered(animalId, filters) {
    if (!animalId) throw this._createError('animal_id es requerido');
    return await analysisRepository.findFiltered(animalId, filters);
  }

  async deleteAnalysis(id) {
    if (!id) throw this._createError('id es requerido');

    const deleted = await analysisRepository.delete(id);

    if (!deleted) throw this._createError('Análisis no encontrado');

    if (deleted.imagenes && Array.isArray(deleted.imagenes)) {
      deleted.imagenes.forEach(detail => {
        if (detail.image_path) {
          const filePath = path.join(
            __dirname,
            '../../uploads',
            path.basename(detail.image_path)
          );
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`🗑️ Imagen eliminada: ${filePath}`);
            } catch (e) {
              console.warn(`⚠️ No se pudo eliminar imagen: ${e.message}`);
            }
          }
        }
      });
    }

    return deleted;
  }

  _createError(message, details = null) {
    const error = new Error(
      JSON.stringify({
        message,
        details: Array.isArray(details) ? details : (details || null),
        timestamp: new Date().toISOString(),
      })
    );
    return error;
  }
}

module.exports = new AnalysisService();