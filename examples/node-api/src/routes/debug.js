import express from 'express';
import { ChromeExtractor } from 'ai-debug-extractor';

const router = express.Router();

// Get instance of ChromeExtractor (initialized in index.js)
const chromeExtractor = ChromeExtractor.getInstance();

// Get all console logs
router.get('/logs', async (req, res, next) => {
  try {
    const logs = await chromeExtractor.getLogs({
      types: ['error', 'warning', 'info'],
      limit: parseInt(req.query.limit) || 100
    });
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

// Get error logs only
router.get('/errors', async (req, res, next) => {
  try {
    const errors = await chromeExtractor.getLogs({
      types: ['error'],
      limit: parseInt(req.query.limit) || 50
    });
    
    res.json({
      success: true,
      data: errors
    });
  } catch (error) {
    next(error);
  }
});

// Get network requests
router.get('/network', async (req, res, next) => {
  try {
    const requests = await chromeExtractor.getNetworkRequests({
      includeResponseBodies: req.query.includeResponses === 'true',
      limit: parseInt(req.query.limit) || 50
    });
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    next(error);
  }
});

// Clear all logs
router.post('/clear', async (req, res, next) => {
  try {
    await chromeExtractor.clearLogs();
    
    res.json({
      success: true,
      message: 'Logs cleared successfully'
    });
  } catch (error) {
    next(error);
  }
});

export const debugRouter = router; 