const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getAllManagers,
  getUserById,
  addUserSkill,
  removeUserSkill,
  getEmployeesBySkill
} = require('../controllers/userController');
const { authenticate, requireManager } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Manager only routes
router.get('/employees', requireManager, getAllEmployees);
router.get('/managers', getAllManagers);
router.get('/skill/:skillId', requireManager, getEmployeesBySkill);

// User routes
router.get('/:id', getUserById);
router.post('/:id/skills', addUserSkill);
router.delete('/:id/skills/:skillId', removeUserSkill);

module.exports = router;