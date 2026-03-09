const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'skill-train-secret-key-2024';

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows[0]) return res.status(401).json({ error: 'User not found' });
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows[0]) return res.status(400).json({ error: 'Email already exists' });
    
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, password_hash, role || 'employee']
    );
    
    const token = jwt.sign({ id: result.rows[0].id, email, role: result.rows[0].role, name }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ message: 'User registered successfully', user: result.rows[0], token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    
    // For seeded users with placeholder passwords (they start with $2a$10$YourHashedPassword)
    const isPlaceholderPassword = user.password_hash.startsWith('$2a$10$YourHashedPassword');
    const isValidPassword = isPlaceholderPassword 
      ? password === 'password123' 
      : await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid email or password' });
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } });
});

// Skills routes
app.get('/api/skills', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM skills ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/skills', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can create skills' });
  try {
    const { name, description, category } = req.body;
    const result = await pool.query(
      'INSERT INTO skills (name, description, category) VALUES ($1, $2, $3) RETURNING *',
      [name, description, category]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User skills
app.get('/api/users/:id/skills', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT us.*, s.name as skill_name, s.description, s.category 
      FROM user_skills us 
      JOIN skills s ON us.skill_id = s.id 
      WHERE us.user_id = $1
    `, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:id/skills', auth, async (req, res) => {
  try {
    const { skill_id, proficiency_level } = req.body;
    const result = await pool.query(
      'INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, $3) ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = $3 RETURNING *',
      [req.params.id, skill_id, proficiency_level || 'beginner']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Projects routes
app.get('/api/projects', auth, async (req, res) => {
  try {
    let query = `
      SELECT p.*, 
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name, 'description', s.description)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as required_skills
      FROM projects p
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
    `;
    
    if (req.user.role === 'manager') {
      query += ' WHERE p.manager_id = $1 GROUP BY p.id ORDER BY p.created_at DESC';
      const result = await pool.query(query, [req.user.id]);
      res.json(result.rows);
    } else {
      query += ` WHERE p.id IN (SELECT project_id FROM project_assignments WHERE employee_id = $1) GROUP BY p.id ORDER BY p.created_at DESC`;
      const result = await pool.query(query, [req.user.id]);
      res.json(result.rows);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can create projects' });
  try {
    const { name, description, required_skills, status } = req.body;
    const result = await pool.query(
      'INSERT INTO projects (name, description, manager_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, req.user.id, status || 'pending']
    );
    
    if (required_skills && required_skills.length > 0) {
      for (const skillId of required_skills) {
        await pool.query('INSERT INTO project_skills (project_id, skill_id) VALUES ($1, $2)', [result.rows[0].id, skillId]);
      }
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Project assignments
app.post('/api/projects/:id/assign', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can assign employees' });
  try {
    const { employee_id } = req.body;
    
    // Check if already assigned
    const existing = await pool.query(
      'SELECT * FROM project_assignments WHERE project_id = $1 AND employee_id = $2',
      [req.params.id, employee_id]
    );
    if (existing.rows[0]) return res.status(400).json({ error: 'Employee already assigned to this project' });
    
    await pool.query(
      'INSERT INTO project_assignments (project_id, employee_id) VALUES ($1, $2)',
      [req.params.id, employee_id]
    );
    
    // Create notifications for required skills
    const projectSkills = await pool.query(`
      SELECT s.id, s.name FROM skills s
      JOIN project_skills ps ON s.id = ps.skill_id
      WHERE ps.project_id = $1
    `, [req.params.id]);
    
    const project = await pool.query('SELECT name FROM projects WHERE id = $1', [req.params.id]);
    
    for (const skill of projectSkills.rows) {
      await pool.query(
        'INSERT INTO notifications (user_id, project_id, skill_id, message) VALUES ($1, $2, $3, $4)',
        [employee_id, req.params.id, skill.id, `You need to complete "${skill.name}" skill for project "${project.rows[0].name}"`]
      );
    }
    
    res.json({ message: 'Employee assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tasks for employees
app.get('/api/tasks', auth, async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Only employees can view tasks' });
  try {
    const result = await pool.query(`
      SELECT st.*, s.name as skill_name, s.description as skill_description, p.name as project_name
      FROM skill_tasks st
      JOIN skills s ON st.skill_id = s.id
      JOIN projects p ON st.project_id = p.id
      JOIN project_assignments pa ON pa.project_id = st.project_id
      WHERE pa.employee_id = $1 AND st.is_completed = false
      ORDER BY st.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/:id/complete', auth, async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Only employees can complete tasks' });
  try {
    await pool.query('UPDATE skill_tasks SET is_completed = true, completed_at = NOW() WHERE id = $1', [req.params.id]);
    
    // Delete related notification
    const task = await pool.query('SELECT skill_id, project_id FROM skill_tasks WHERE id = $1', [req.params.id]);
    if (task.rows[0]) {
      await pool.query(
        'DELETE FROM notifications WHERE user_id = $1 AND skill_id = $2 AND project_id = $3',
        [req.user.id, task.rows[0].skill_id, task.rows[0].project_id]
      );
    }
    
    res.json({ message: 'Task marked as completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notifications
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, s.name as skill_name, p.name as project_name
      FROM notifications n
      LEFT JOIN skills s ON n.skill_id = s.id
      LEFT JOIN projects p ON n.project_id = p.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Users list for managers
app.get('/api/users', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can view users' });
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE role = $1 ORDER BY name', ['employee']);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all employees with their skills
app.get('/api/employees', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can view employees' });
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email,
        COALESCE(
          json_agg(
            json_build_object('skill_id', us.skill_id, 'skill_name', s.name, 'proficiency_level', us.proficiency_level)
          ) FILTER (WHERE us.skill_id IS NOT NULL), '[]'
        ) as skills
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE u.role = 'employee'
      GROUP BY u.id
      ORDER BY u.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;