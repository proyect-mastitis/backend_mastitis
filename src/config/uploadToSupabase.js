const supabase = require('../config/supabase');
const path = require('path');

/**
 * 📤 Sube una imagen a Supabase Storage
 * @param {Object} file - Archivo de multer (file.buffer, file.mimetype, file.originalname)
 * @returns {Promise<string>} URL pública de la imagen
 */
async function uploadToSupabase(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    // ✅ Generar nombre único
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;

    // ✅ Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // ✅ Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    console.log(`✅ Imagen subida a Supabase: ${publicUrl}`);
    return publicUrl;

  } catch (error) {
    console.error('❌ Error uploading image to Supabase:', error.message);
    throw error;
  }
}

module.exports = uploadToSupabase;