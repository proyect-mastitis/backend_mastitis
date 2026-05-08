require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

//USUARIOS
const userRoutes = require('./src/routes/userRoutes');

app.use('/api/users', userRoutes);

// ANIMALES
const animalRoutes = require('./src/routes/animalRoutes');

app.use('/api/animals', animalRoutes);
// permitir acceso a imágenes
app.use('/uploads', express.static('uploads'));

//

const analysisRoutes = require('./src/routes/analysisRoutes');

app.use('/api/analysis', analysisRoutes);

// En tu main.js o app.js, añade:

const reportsRoutes = require('./src/routes/reportsRoutes');
app.use('/api/reports', reportsRoutes);

// Debe ir DESPUÉS de los otros routes

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
