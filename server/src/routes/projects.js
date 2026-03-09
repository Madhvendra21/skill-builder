const express = require('express');
const router = express.Router();
const {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  assignEmployee,
  removeEmployee,
  addProjectSkill,
  removeProjectSkill
} = require('../controllers/projectController');
const { authenticate, requireManager } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Project routes
router.get('/', getAllProjects);
router.get('/:id', getProjectById);

// Manager only routes
router.post('/', requireManager, createProject);
router.put('/:id', requireManager, updateProject);
router.delete('/:id', requireManager, deleteProject);

// Assignment routes (manager only)
router.post('/:id/assign', requireManager, assignEmployee);
router.delete('/:id/assign/:employeeId', requireManager, removeEmployee);

// Project skill routes (manager only)
router.post('/:id/skills', requireManager, addProjectSkill);
router.delete('/:id/skills/:skillId', requireManager, removeProjectSkill);

module.exports = router;