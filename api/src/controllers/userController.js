const { query } = require('../config/database');

// Get all employees (manager only)
const getAllEmployees = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'proficiency_level', us.proficiency_level
            )
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as skills
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE u.role = 'employee'
      GROUP BY u.id, u.name, u.email, u.created_at
      ORDER BY u.name
    `);

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
};

// Get all managers
const getAllManagers = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, created_at FROM users WHERE role = $1 ORDER BY name',
      ['manager']
    );

    res.json({ managers: result.rows });
  } catch (error) {
    console.error('Get managers error:', error);
    res.status(500).json({ error: 'Failed to get managers' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'description', s.description,
              'proficiency_level', us.proficiency_level
            )
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as skills
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Add skill to user
const addUserSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skill_id, proficiency_level = 'beginner' } = req.body;

    if (!skill_id) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }

    // Check if skill exists
    const skillCheck = await query('SELECT id, name FROM skills WHERE id = $1', [skill_id]);
    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Add or update user skill
    const result = await query(`
      INSERT INTO user_skills (user_id, skill_id, proficiency_level)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, skill_id)
      DO UPDATE SET proficiency_level = $3
      RETURNING *
    `, [id, skill_id, proficiency_level]);

    res.json({
      message: 'Skill added to user',
      userSkill: {
        ...result.rows[0],
        skill_name: skillCheck.rows[0].name
      }
    });
  } catch (error) {
    console.error('Add user skill error:', error);
    res.status(500).json({ error: 'Failed to add skill to user' });
  }
};

// Remove skill from user
const removeUserSkill = async (req, res) => {
  try {
    const { id, skillId } = req.params;

    const result = await query(
      'DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2 RETURNING *',
      [id, skillId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User skill not found' });
    }

    res.json({ message: 'Skill removed from user' });
  } catch (error) {
    console.error('Remove user skill error:', error);
    res.status(500).json({ error: 'Failed to remove skill from user' });
  }
};

// Get employees by skill
const getEmployeesBySkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    const result = await query(`
      SELECT u.id, u.name, u.email, us.proficiency_level
      FROM users u
      JOIN user_skills us ON u.id = us.user_id
      WHERE us.skill_id = $1 AND u.role = 'employee'
      ORDER BY u.name
    `, [skillId]);

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('Get employees by skill error:', error);
    res.status(500).json({ error: 'Failed to get employees by skill' });
  }
};

module.exports = {
  getAllEmployees,
  getAllManagers,
  getUserById,
  addUserSkill,
  removeUserSkill,
  getEmployeesBySkill
};