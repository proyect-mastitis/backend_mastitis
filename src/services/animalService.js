const animalRepository = require('../repositories/animalRepository');

class AnimalService {
  async createAnimal(animalData, usuarioId) {
    const { codigo, raza, nro_partos, fecha_nacimiento, descripcion, imagen } = animalData;

    if (!codigo || codigo.trim() === '') {
      throw new Error('Agregar codigo del animal');
    }

    if (isNaN(nro_partos) || parseInt(nro_partos) <= 0) {
      throw new Error('El número de partos debe ser mayor a 0');
    }

    const razaRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!razaRegex.test(raza.trim())) {
      throw new Error('La raza solo debe contener solo letras');
    }
    
    if (fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento.trim())) {
      throw new Error('La fecha debe estar en formato YYYY-MM-DD');
    }

    return await animalRepository.create({
      codigo: codigo.trim(),
      raza: raza.trim(),
      nro_partos: parseInt(nro_partos),
      fecha_nacimiento: fecha_nacimiento ? fecha_nacimiento.trim() : null,
      descripcion: descripcion && descripcion.trim() ? descripcion.trim() : null,
      imagen,
      usuario_id: usuarioId,
    });
  }

  async updateAnimal(id, animalData, usuarioId) {
 
    if (!id) {
      throw new Error('id es requerido');
    }

    const animal = await animalRepository.findById(id);
    if (!animal) {
      throw new Error('Animal no encontrado');
    }

    if (animal.usuario_id !== usuarioId) {
      throw new Error('No tienes permiso para actualizar este animal');
    }
    
    const { codigo, raza, nro_partos, fecha_nacimiento, descripcion, imagen } = animalData;
   
    if (!codigo || codigo.trim() === '') {
      throw new Error('Agregar codigo del animal');
    }
    
    if (raza) {
      const razaRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
      if (!razaRegex.test(raza.trim())) {
        throw new Error('La raza solo debe contener solo letras');
      }
    }

    if (nro_partos && (isNaN(nro_partos) || parseInt(nro_partos) <= 0)) {
      throw new Error('El número de partos debe ser mayor a 0');
    }
    if (fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento.trim())) {
      throw new Error('La fecha debe estar en formato YYYY-MM-DD');
    }

    const cleanedData = {
      codigo: codigo ? codigo.trim() : animal.codigo,
      raza: raza ? raza.trim() : animal.raza,
      nro_partos: nro_partos ? parseInt(nro_partos) : animal.nro_partos,
      fecha_nacimiento: fecha_nacimiento ? fecha_nacimiento.trim() : animal.fecha_nacimiento,
      descripcion: descripcion ? descripcion.trim() : animal.descripcion,
      imagen: imagen || null,
    };

    return await animalRepository.update(id, cleanedData, usuarioId);
  }

  async getAnimalsByUser(usuarioId) {
    if (!usuarioId) {
      throw new Error('usuario_id es requerido');
    }

    const animales = await animalRepository.findByUserId(usuarioId);
    return animales.map(animal => this._formatAnimal(animal));
  }

  _formatAnimal(animal) {
    return {
      ...animal,
      fecha_nacimiento: animal.fecha_nacimiento
        ? new Date(animal.fecha_nacimiento).toISOString().split('T')[0]
        : null,
    };
  }

  async deleteAnimal(id, usuarioId) {
    if (!id) {
      throw new Error('id es requerido');
    }

    const animal = await animalRepository.findById(id);
    if (!animal) {
      throw new Error('Animal no encontrado');
    }

    if (animal.usuario_id !== usuarioId) {
      throw new Error('No tienes permiso para eliminar este animal');
    }

    await animalRepository.delete(id, usuarioId);
  }
}

module.exports = new AnimalService();