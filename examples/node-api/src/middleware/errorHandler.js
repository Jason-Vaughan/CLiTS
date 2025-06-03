import { setupLogging } from '../utils/logger.js';

const logger = setupLogging();

export function errorHandler(err, req, res) {
  // Log the error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err.name === 'ChromeExtractorError') {
    return res.status(500).json({
      error: 'Chrome Extractor Error',
      message: err.message,
      details: err.details
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred'
      : err.message
  });
} 