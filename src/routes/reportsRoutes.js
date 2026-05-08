const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const verifyToken = require('../middlewares/authMiddleware');

/**
 * GET /api/reports/health-status
 * Casos detectados
 */
router.get(
  '/health-status',
  verifyToken,
  (req, res) => reportsController.getHealthStatusReport(req, res)
);

/**
 * GET /api/reports/precision
 * Precisión del sistema
 */
router.get(
  '/precision',
  verifyToken,
  (req, res) => reportsController.getPrecisionReport(req, res)
);

/**
 * GET /api/reports/processing-time
 * Tiempo de procesamiento
 */
router.get(
  '/processing-time',
  verifyToken,
  (req, res) => reportsController.getProcessingTimeReport(req, res)
);

module.exports = router;