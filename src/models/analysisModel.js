class Analysis {
  constructor(
    id,
    animal_id,
    resultado,
    confianza,
    imagenes,
    is_valid = false,
    mastitis_detected = false,
    valid_count = 0,
    total_uploaded = 0,
    processing_time_ms = 0, // ✅ AGREGADO
    fecha = null,
    proxima_revision = null // ✅ AGREGADO
  ) {
    this.id = id;
    this.animal_id = animal_id;
    this.resultado = resultado;
    this.confianza = confianza;
    this.imagenes = imagenes;
    this.is_valid = is_valid;
    this.mastitis_detected = mastitis_detected;
    this.valid_count = valid_count;
    this.total_uploaded = total_uploaded;
    this.processing_time_ms = processing_time_ms; // ✅ AGREGADO
    this.fecha = fecha || new Date();
    this.proxima_revision = proxima_revision; // ✅ AGREGADO
  }
}

module.exports = Analysis;