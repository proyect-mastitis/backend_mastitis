const animalService = require('../services/animalService');
const uploadToSupabase = require('../config/uploadToSupabase');

class AnimalController {
  async createAnimal(req, res) {
    try {
      if (!req.file) {
        throw new Error('La imagen del animal es obligatoria');
      }

      // ✅ Subir a Supabase Storage
      const imagenUrl = await uploadToSupabase(req.file);

      const animal = await animalService.createAnimal(
        {
          codigo: req.body.codigo,
          raza: req.body.raza,
          nro_partos: parseInt(req.body.nro_partos),
          fecha_nacimiento: req.body.fecha_nacimiento,
          descripcion: req.body.descripcion,
          imagen: imagenUrl, // ✅ Guardar URL de Supabase
        },
        req.user.id
      );

      res.status(201).json({
        message: 'Animal registrado exitosamente',
        animal,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAnimals(req, res) {
    try {
      const animales = await animalService.getAnimalsByUser(req.user.id);
      res.json(animales);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateAnimal(req, res) {
    try {
      let imagenUrl;

      // ✅ Si hay imagen nueva, subirla a Supabase
      if (req.file) {
        imagenUrl = await uploadToSupabase(req.file);
      }

      const animal = await animalService.updateAnimal(
        req.params.id,
        {
          codigo: req.body.codigo,
          raza: req.body.raza,
          nro_partos: parseInt(req.body.nro_partos),
          fecha_nacimiento: req.body.fecha_nacimiento,
          descripcion: req.body.descripcion,
          imagen: imagenUrl, // ✅ URL de Supabase o undefined
        },
        req.user.id
      );

      res.json({
        message: 'Animal actualizado exitosamente',
        animal,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteAnimal(req, res) {
    try {
      await animalService.deleteAnimal(req.params.id, req.user.id);
      res.json({ message: 'Animal eliminado exitosamente' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new AnimalController();