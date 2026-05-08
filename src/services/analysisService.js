const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const analysisRepository = require('../repositories/analysisRepository');
const Analysis = require('../models/analysisModel');
const uploadToSupabase = require('../config/uploadToSupabase');
const deleteFromSupabase = require('../config/deleteFromSupabase'); // ✅ NUEVO

const ML_SERVER_URL = process.env.ML_SERVER_URL 
  || 'https://LESLY1-mastitis-ml.hf.space';

class AnalysisService {
  async analyzeAnimal(animalId, files) {
    if (!animalId) throw this._createError('animal_id es requerido');
    if (!files || files.length < 1) throw this._createError('Debe subir al menos 1 imagen');
    if (files.length > 2) throw this._createError('Máximo 2 imágenes permitidas');

    const startTime = Date.now();

    const formData = new FormData();
    formData.append('animal_id', animalId);

    // ✅ CORREGIDO: Manejar ambos casos (multer disk y memory storage)
    for (const file of files) {
      if (file.path) {
        // Si es disk storage (tiene path)
        const fileStream = fs.createReadStream(file.path);
        formData.append('files', fileStream, file.originalname);
      } else if (file.buffer) {
        // Si es memory storage (tiene buffer)
        formData.append('files', file.buffer, file.originalname);
      }
    }

    try {
      console.log(`📤 Enviando análisis a ${ML_SERVER_URL}/analyze`);

      const response = await axios.post(`${ML_SERVER_URL}/analyze`, formData, {
        headers: formData.getHeaders(),
        timeout: 180000,
      });

      const result = response.data;
      const processingTimeMs = Date.now() - startTime;

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

      // ✅ MEJORADO: Descargar, guardar en Supabase y obtener URL
      const processedDetails = await Promise.all(
        result.details
          .filter(detail => detail.valid === true)
          .map(async (detail) => {
            let finalImagePath = null;

            // ✅ CORREGIDO: Validar que image_path exista y no sea undefined
            if (detail.image_path && typeof detail.image_path === 'string' && detail.image_path.trim()) {
              try {
                const imageFilename = path.basename(detail.image_path);
                const sourceUrl = `${ML_SERVER_URL}${detail.image_path}`;

                console.log(`📥 Descargando: ${sourceUrl}`);
                const imageResponse = await axios.get(sourceUrl, { 
                  responseType: 'arraybuffer',
                  timeout: 30000
                });

                // ✅ Crear objeto similar a multer file para uploadToSupabase
                const supabaseFile = {
                  buffer: imageResponse.data,
                  mimetype: 'image/jpeg', // Ajustar según tipo real
                  originalname: imageFilename,
                };

                // ✅ Subir a Supabase Storage
                finalImagePath = await uploadToSupabase(supabaseFile);
                console.log(`✅ Guardada en Supabase: ${finalImagePath}`);

              } catch (err) {
                console.warn(`⚠️ Error descargando/subiendo imagen: ${err.message}`);
                // Si falla, asignar null
                finalImagePath = null;
              }
            } else {
              console.warn(`⚠️ image_path no válido para imagen ${detail.image_position}: ${detail.image_path}`);
            }

            return {
              image_position: detail.image_position,
              filename: detail.filename,
              valid: detail.valid,
              status: detail.status,
              mastitis_detected: detail.mastitis_detected,
              confidence: detail.confidence,
              image_path: finalImagePath, // ✅ URL de Supabase o null
              image_id: detail.image_id,
              image_width: detail.image_width,
              image_height: detail.image_height,
              box: detail.box,
            };
          })
      );

      // ✅ Calcular próxima revisión
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
        processingTimeMs,
        new Date(),
        proximaRevision
      );

      const savedAnalysis = await analysisRepository.create(analysis);

      return {
        id: savedAnalysis.id,
        animal_id: savedAnalysis.animal_id,
        status: savedAnalysis.resultado,
        mastitis_detected: savedAnalysis.mastitis_detected,
        confidence: savedAnalysis.confianza,
        analysis_date: savedAnalysis.fecha,
        processing_time_ms: savedAnalysis.processing_time_ms,
        proxima_revision: savedAnalysis.proxima_revision,
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
      // ✅ MEJORADO: Limpiar solo archivos de disk storage
      if (files && Array.isArray(files)) {
        files.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            try {
              fs.unlinkSync(file.path);
              console.log(`��� Archivo temporal eliminado: ${file.path}`);
            } catch (e) {
              console.warn(`⚠️ No se pudo eliminar ${file.path}:`, e.message);
            }
          }
        });
      }
    }
  }

  _calculateNextReview(analysisDate, isMastitis) {
    const nextDate = new Date(analysisDate);
    if (isMastitis) {
      nextDate.setDate(nextDate.getDate() + 3);
    } else {
      nextDate.setDate(nextDate.getDate() + 15);
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

  // ✅ MEJORADO: Eliminar análisis y sus imágenes
  async deleteAnalysis(id) {
    if (!id) throw this._createError('id es requerido');

    // 1️⃣ Obtener el análisis ANTES de eliminarlo
    const analysis = await analysisRepository.findById(id);
    if (!analysis) throw this._createError('Análisis no encontrado');

    // 2️⃣ Eliminar imágenes de Supabase Storage
    if (analysis.imagenes && Array.isArray(analysis.imagenes)) {
      console.log(`🗑️ Eliminando ${analysis.imagenes.length} imágenes de Supabase...`);
      
      for (const imagen of analysis.imagenes) {
        if (imagen.image_path) {
          await deleteFromSupabase(imagen.image_path);
        }
      }
    }

    // 3️⃣ Eliminar registro de la base de datos
    const deleted = await analysisRepository.delete(id);

    if (!deleted) throw this._createError('Error al eliminar análisis de la BD');

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