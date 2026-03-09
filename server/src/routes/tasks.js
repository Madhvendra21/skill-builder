const express = require('express');
const router = express.Router();
const {
  getMyTasks,
  getTasksByProject,
  getTaskById,
  completeTask,
  getTaskStats,
  getProjectProgress
} = require('../controllers/taskController');
const { authenticate, requireManager } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Employee routes
router.get('/my', getMyTasks);
router.get('/stats', getTaskStats);
router.put('/:id/complete', completeTask);
router.get('/:id', getTaskById);

// Manager routes
router.get('/project/:projectId', requireManager, getTasksByProject);
router.get('/project/:projectId/progress', requireManager, getProjectProgress);

module.exports = router;