const express = require('express');
const router = express.Router();
const {
  getAllSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillsByCategory
} = require('../controllers/skillController');
const { authenticate, requireManager } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Skill routes
router.get('/', getAllSkills);
router.get('/categories', getSkillsByCategory);
router.get('/:id', getSkillById);

// Manager only routes
router.post('/', requireManager, createSkill);
router.put('/:id', requireManager, updateSkill);
router.delete('/:id', requireManager, deleteSkill);

module.exports = router;