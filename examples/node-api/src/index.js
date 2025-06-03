import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { ChromeExtractor, ChromeErrorHandler } from 'ai-debug-extractor';
import { setupLogging } from './utils/logger.js';
import { debugRouter } from './routes/debug.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Setup logging
const logger = setupLogging();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Chrome Debug Extractor
const chromeExtractor = new ChromeExtractor({
  port: 9222,
  retryOptions: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000
  },
  errorHandler: new ChromeErrorHandler({
    suppressErrors: ['TASK_CATEGORY_POLICY'],
    logErrors: true
  })
});

// Routes
app.use('/api/debug', debugRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  
  // Initialize Chrome connection
  chromeExtractor.initialize()
    .then(() => {
      logger.info('Chrome Debug Extractor initialized successfully');
    })
    .catch((error) => {
      logger.error('Failed to initialize Chrome Debug Extractor:', error);
    });
}); 