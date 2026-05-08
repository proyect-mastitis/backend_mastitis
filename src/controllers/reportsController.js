const reportsService = require('../services/reportsService');

class ReportsController {
  async getHealthStatusReport(req, res) {
    try {
      const { startDate, endDate, animalId, status } = req.query;
      const report = await reportsService.getDetectedCasesReport(
        req.user.id,
        startDate,
        endDate,
        animalId ? parseInt(animalId) : null,
        status
      );
      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

 async getPrecisionReport(req, res) {
    try {
      const { startDate, endDate, animalId, status } = req.query;
      const report = await reportsService.getPrecisionReport(
        req.user.id,
        startDate,
        endDate,
        animalId ? parseInt(animalId) : null,
        status
      );
      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

 async getProcessingTimeReport(req, res) {
    try {
      const { startDate, endDate, animalId, status } = req.query;
      const report = await reportsService.getProcessingTimeReport(
        req.user.id,
        startDate,
        endDate,
        animalId ? parseInt(animalId) : null,
        status
      );
      return res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('❌ Error:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}


module.exports = new ReportsController();