const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

class UserService {
  async register(userData) {
    const { nombres, apellidos, correo, password } = userData;

    // 🔴 Campos obligatorios
    if (!nombres || !apellidos || !correo || !password) {
      throw new Error('Todos los campos son obligatorios');
    }

    // 🟡 SOLO LETRAS (nombres y apellidos)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

    if (!nameRegex.test(nombres)) {
      throw new Error('Nombres solo deben contener letras');
    }

    if (!nameRegex.test(apellidos)) {
      throw new Error('Apellidos solo deben contener letras');
    }

    // 🟡 CORREO VÁLIDO (más real que solo @)
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[a-zA-Z]{2,}$/;

    if (!emailRegex.test(correo)) {
      throw new Error('Correo inválido');
    }

    // 🟡 PASSWORD SEGURA (letras + números mínimo 6)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

    if (!passwordRegex.test(password)) {
      throw new Error('La contraseña debe tener letras y números (mínimo 6 caracteres)');
    }

    // 🔴 verificar duplicado
    const existing = await userRepository.findByEmail(correo);
    if (existing) {
      throw new Error('El correo ya está registrado');
    }

    // 🔐 hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    return await userRepository.create({
      nombres,
      apellidos,
      correo,
      password: hashedPassword,
    });
  }

  async login(correo, password) {
    if (!correo || !password) {
      throw new Error('Correo y contraseña son obligatorios');
    }

    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[a-zA-Z]{2,}$/;
    if (!emailRegex.test(correo)) {
      throw new Error('Correo inválido');
    }

    const user = await userRepository.findByEmail(correo);

    if (!user) {
      throw new Error('Credenciales incorrectas');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new Error('Credenciales incorrectas');
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      user: {
        id: user.id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
      },
      token,
    };
  }
}

module.exports = new UserService();