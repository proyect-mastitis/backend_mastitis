const supabase = require('./supabase');

/**
 * 🗑️ Elimina una imagen de Supabase Storage
 * @param {string} imageUrl - URL pública de la imagen en Supabase
 * @returns {Promise<boolean>} true si se eliminó, false si falló
 */
async function deleteFromSupabase(imageUrl) {
  if (!imageUrl) {
    console.warn('⚠️ No hay URL de imagen para eliminar');
    return false;
  }

  try {
    // ✅ Extraer el nombre del archivo de la URL
    // URL: https://zfishtozrjamgkhjtzyp.supabase.co/storage/v1/object/public/uploads/1778255616578-3id5zt.jpeg
    // Necesitamos: 1778255616578-3id5zt.jpeg
    
    const urlParts = imageUrl.split('/uploads/');
    if (urlParts.length < 2) {
      console.warn(`⚠️ URL de imagen inválida: ${imageUrl}`);
      return false;
    }

    const fileName = urlParts[1];

    console.log(`🗑️ Eliminando de Supabase: ${fileName}`);

    const { error } = await supabase.storage
      .from('uploads')
      .remove([fileName]);

    if (error) {
      console.error(`❌ Error eliminando imagen de Supabase: ${error.message}`);
      return false;
    }

    console.log(`✅ Imagen eliminada de Supabase: ${fileName}`);
    return true;

  } catch (error) {
    console.error('❌ Error en deleteFromSupabase:', error.message);
    return false;
  }
}

module.exports = deleteFromSupabase;