const { query } = require('../config/database');

// Get all skills
const getAllSkills = async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM user_skills WHERE skill_id = s.id) as employee_count
      FROM skills s
      ORDER BY s.category, s.name
    `);

    res.json({ skills: result.rows });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
};

// Get skill by ID
const getSkillById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM skills WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ skill: result.rows[0] });
  } catch (error) {
    console.error('Get skill error:', error);
    res.status(500).json({ error: 'Failed to get skill' });
  }
};

// Create new skill (manager only)
const createSkill = async (req, res) => {
  try {
    const { name, description, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Skill name is required' });
    }

    // Check if skill already exists
    const existingSkill = await query('SELECT id FROM skills WHERE name = $1', [name]);
    if (existingSkill.rows.length > 0) {
      return res.status(409).json({ error: 'Skill with this name already exists' });
    }

    const result = await query(
      'INSERT INTO skills (name, description, category) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, category || null]
    );

    res.status(201).json({
      message: 'Skill created successfully',
      skill: result.rows[0]
    });
  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
};

// Update skill (manager only)
const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category } = req.body;

    // Check if skill exists
    const skillCheck = await query('SELECT * FROM skills WHERE id = $1', [id]);
    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Check for duplicate name if name is being changed
    if (name && name !== skillCheck.rows[0].name) {
      const duplicateCheck = await query('SELECT id FROM skills WHERE name = $1 AND id != $2', [name, id]);
      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Skill with this name already exists' });
      }
    }

    const result = await query(`
      UPDATE skills 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          category = COALESCE($3, category)
      WHERE id = $4
      RETURNING *
    `, [name, description, category, id]);

    res.json({
      message: 'Skill updated successfully',
      skill: result.rows[0]
    });
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
};

// Delete skill (manager only)
const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM skills WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
};

// Get skills by category
const getSkillsByCategory = async (req, res) => {
  try {
    const result = await query(`
      SELECT category, json_agg(s) as skills
      FROM skills s
      GROUP BY category
      ORDER BY category
    `);

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get skills by category error:', error);
    res.status(500).json({ error: 'Failed to get skills by category' });
  }
};

module.exports = {
  getAllSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillsByCategory
};