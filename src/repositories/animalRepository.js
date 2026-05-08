const pool = require('../config/db');
const Animal = require('../models/animalModel');

class AnimalRepository {
  async create(animalData) {
    const result = await pool.query(
      `INSERT INTO animales(codigo, raza, nro_partos, fecha_nacimiento, descripcion, imagen, usuario_id)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        animalData.codigo,
        animalData.raza,
        animalData.nro_partos,
        animalData.fecha_nacimiento,
        animalData.descripcion,
        animalData.imagen,
        animalData.usuario_id,
      ]
    );
    return result.rows[0];
  }

  async findByUserId(usuario_id) {
    const result = await pool.query(
      `SELECT * FROM animales WHERE usuario_id = $1 ORDER BY id DESC`,
      [usuario_id]
    );
    return result.rows;
  }

  async findById(id) {
    const result = await pool.query(
      `SELECT * FROM animales WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // ✅ NUEVO: Obtener todos los análisis de un animal
  async findAnalysisByAnimalId(animal_id) {
    const result = await pool.query(
      `SELECT * FROM analisis WHERE animal_id = $1`,
      [animal_id]
    );
    return result.rows;
  }

  async update(id, animalData, usuario_id) {
    let query, values;

    if (animalData.imagen) {
      query = `
        UPDATE animales 
        SET codigo=$1, raza=$2, nro_partos=$3, fecha_nacimiento=$4, 
            descripcion=$5, imagen=$6
        WHERE id=$7 AND usuario_id=$8
        RETURNING *
      `;
      values = [
        animalData.codigo,
        animalData.raza,
        animalData.nro_partos,
        animalData.fecha_nacimiento,
        animalData.descripcion,
        animalData.imagen,
        id,
        usuario_id,
      ];
    } else {
      query = `
        UPDATE animales 
        SET codigo=$1, raza=$2, nro_partos=$3, fecha_nacimiento=$4, descripcion=$5
        WHERE id=$6 AND usuario_id=$7
        RETURNING *
      `;
      values = [
        animalData.codigo,
        animalData.raza,
        animalData.nro_partos,
        animalData.fecha_nacimiento,
        animalData.descripcion,
        id,
        usuario_id,
      ];
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async delete(id, usuario_id) {
    await pool.query(
      `DELETE FROM animales WHERE id=$1 AND usuario_id=$2`,
      [id, usuario_id]
    );
  }
}

module.exports = new AnimalRepository();