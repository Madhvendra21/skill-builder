const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const app = express();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'));
    }
  }
});

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

// Helper: Extract skills from resume text
const extractSkillsFromResume = (text, availableSkills) => {
  const extractedSkills = [];
  const textLower = text.toLowerCase();
  
  for (const skill of availableSkills) {
    const skillName = skill.name.toLowerCase();
    const skillVariations = [
      skillName,
      skillName.replace(/\s+/g, ''), // Remove spaces
      skillName.replace(/\./g, ''),  // Remove dots
      skillName.replace(/\+/g, 'p'), // Replace + with p
    ];
    
    // Check if skill name or variations appear in the text
    if (skillVariations.some(variation => textLower.includes(variation))) {
      // Determine proficiency based on context
      let proficiency = 'beginner';
      const contextWindow = textLower.substring(
        Math.max(0, textLower.indexOf(skillName) - 100),
        Math.min(textLower.length, textLower.indexOf(skillName) + skillName.length + 100)
      );
      
      if (contextWindow.includes('expert') || contextWindow.includes('advanced') || contextWindow.includes('years')) {
        proficiency = 'advanced';
      } else if (contextWindow.includes('intermediate') || contextWindow.includes('experience')) {
        proficiency = 'intermediate';
      }
      
      extractedSkills.push({
        skill_id: skill.id,
        skill_name: skill.name,
        proficiency_level: proficiency
      });
    }
  }
  
  return extractedSkills;
};

// Helper: Generate AI training recommendation
const generateTrainingRecommendation = (skillName) => {
  const recommendations = {
    'JavaScript': ['JavaScript Basics', 'ES6+ Features', 'Async Programming'],
    'Python': ['Python Fundamentals', 'OOP in Python', 'Python for Data Science'],
    'React': ['React Hooks', 'State Management', 'React Router'],
    'Node.js': ['Express.js', 'REST API Design', 'Authentication'],
    'SQL': ['SQL Basics', 'Joins & Subqueries', 'Database Optimization'],
    'Flutter': ['Flutter Widgets', 'State Management', 'Firebase Integration'],
    'Firebase': ['Firebase Basics', 'Cloud Firestore', 'Authentication'],
    'Kotlin': ['Kotlin Fundamentals', 'Android Development', 'Coroutines'],
    'Docker': ['Docker Basics', 'Docker Compose', 'Kubernetes Intro'],
    'AWS': ['AWS EC2', 'S3 Storage', 'Lambda Functions'],
    'Git': ['Git Basics', 'Branching Strategies', 'CI/CD'],
    'TypeScript': ['TypeScript Basics', 'Advanced Types', 'Decorators']
  };
  
  const defaultRecs = [`${skillName} Fundamentals`, `${skillName} Advanced`, `${skillName} Mastery`];
  return recommendations[skillName] || defaultRecs;
};

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// ========== AUTH ROUTES ==========
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
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
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

// ========== USERS ROUTES ==========
app.get('/api/users/employees', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can view employees' });
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
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

app.get('/api/users/managers', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE role = $1 ORDER BY name', ['manager']);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.delete('/api/users/:id/skills/:skillId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2', [req.params.id, req.params.skillId]);
    res.json({ message: 'Skill removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/skill/:skillId', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, us.proficiency_level
      FROM users u
      JOIN user_skills us ON u.id = us.user_id
      WHERE us.skill_id = $1 AND u.role = 'employee'
    `, [req.params.skillId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== RESUME UPLOAD & SKILL EXTRACTION ==========
app.post('/api/users/upload-resume', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }
    
    // Convert buffer to text (simple text extraction)
    const resumeText = req.file.buffer.toString('utf-8');
    
    // Get all available skills from database
    const skillsResult = await pool.query('SELECT id, name FROM skills');
    const availableSkills = skillsResult.rows;
    
    // Extract skills from resume
    const extractedSkills = extractSkillsFromResume(resumeText, availableSkills);
    
    // Add extracted skills to user
    const addedSkills = [];
    for (const skill of extractedSkills) {
      try {
        await pool.query(
          'INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, $3) ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = $3',
          [req.user.id, skill.skill_id, skill.proficiency_level]
        );
        addedSkills.push(skill);
      } catch (err) {
        console.error('Error adding skill:', err);
      }
    }
    
    res.json({
      message: 'Resume processed successfully',
      extracted_skills: addedSkills,
      total_found: extractedSkills.length
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SKILLS ROUTES ==========
app.get('/api/skills', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM skills ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/skills/categories', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM skills WHERE category IS NOT NULL ORDER BY category');
    res.json(result.rows.map(r => r.category));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/skills/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM skills WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Skill not found' });
    res.json(result.rows[0]);
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
    
    // Auto-create training modules for this skill
    const trainings = generateTrainingRecommendation(name);
    for (const trainingName of trainings) {
      await pool.query(
        'INSERT INTO trainings (skill_id, name, description, duration_hours) VALUES ($1, $2, $3, $4)',
        [result.rows[0].id, trainingName, `Learn ${trainingName} to master ${name}`, Math.floor(Math.random() * 20) + 5]
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/skills/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can update skills' });
  try {
    const { name, description, category } = req.body;
    const result = await pool.query(
      'UPDATE skills SET name = $1, description = $2, category = $3 WHERE id = $4 RETURNING *',
      [name, description, category, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/skills/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can delete skills' });
  try {
    await pool.query('DELETE FROM skills WHERE id = $1', [req.params.id]);
    res.json({ message: 'Skill deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PROJECTS ROUTES ==========
app.get('/api/projects', auth, async (req, res) => {
  try {
    let query = `
      SELECT p.*, 
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name, 'description', s.description)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as required_skills,
        COALESCE((SELECT COUNT(*) FROM project_skills WHERE project_id = p.id), 0) as skill_count,
        COALESCE((SELECT COUNT(*) FROM project_assignments WHERE project_id = p.id), 0) as assigned_count
      FROM projects p
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
    `;
    
    if (req.user.role === 'manager') {
      query += ' WHERE p.created_by = $1 GROUP BY p.id ORDER BY p.created_at DESC';
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

app.get('/api/projects/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name, 'description', s.description)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as required_skills
      FROM projects p
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [req.params.id]);
    
    if (!result.rows[0]) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can create projects' });
  try {
    const { name, description, required_skills, status } = req.body;
    const result = await pool.query(
      'INSERT INTO projects (name, description, status, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, status || 'pending', req.user.id]
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

app.put('/api/projects/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can update projects' });
  try {
    const { name, description, status } = req.body;
    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2, status = $3 WHERE id = $4 RETURNING *',
      [name, description, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can delete projects' });
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:id/assign', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can assign employees' });
  try {
    const { employee_id } = req.body;
    
    // Check if already assigned
    const existing = await pool.query(
      'SELECT * FROM project_assignments WHERE project_id = $1 AND employee_id = $2',
      [req.params.id, employee_id]
    );
    if (existing.rows[0]) return res.status(400).json({ error: 'Employee already assigned' });
    
    await pool.query(
      'INSERT INTO project_assignments (project_id, employee_id, assigned_by) VALUES ($1, $2, $3)',
      [req.params.id, employee_id, req.user.id]
    );
    
    // Create skill gaps and auto-assign trainings
    const projectSkills = await pool.query(`
      SELECT s.id, s.name FROM skills s
      JOIN project_skills ps ON s.id = ps.skill_id
      WHERE ps.project_id = $1
    `, [req.params.id]);
    
    const project = await pool.query('SELECT name FROM projects WHERE id = $1', [req.params.id]);
    
    // Check for missing skills and create skill gaps + tasks
    for (const skill of projectSkills.rows) {
      const hasSkill = await pool.query(
        'SELECT * FROM user_skills WHERE user_id = $1 AND skill_id = $2',
        [employee_id, skill.id]
      );
      
      if (!hasSkill.rows[0]) {
        // Create skill gap
        await pool.query(
          'INSERT INTO skill_gaps (employee_id, project_id, skill_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [employee_id, req.params.id, skill.id, 'pending']
        );
        
        // Create skill task for the employee
        await pool.query(
          'INSERT INTO skill_tasks (project_id, employee_id, skill_id, status, assigned_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (project_id, employee_id, skill_id) DO NOTHING',
          [req.params.id, employee_id, skill.id, 'pending', req.user.id]
        );
        
        // Get trainings for this skill and assign first one
        const trainings = await pool.query(
          'SELECT id, name FROM trainings WHERE skill_id = $1 ORDER BY id LIMIT 1',
          [skill.id]
        );
        
        if (trainings.rows[0]) {
          await pool.query(
            'INSERT INTO training_progress (employee_id, training_id, project_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [employee_id, trainings.rows[0].id, req.params.id, 'assigned']
          );
        }
        
        // Create notification
        await pool.query(
          'INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)',
          [employee_id, 'skill_gap', 'New Skill Required', 
           `You need to learn "${skill.name}" for project "${project.rows[0].name}"`,
           skill.id, 'skill']
        );
      }
    }
    
    // Create notification for project assignment
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)',
      [employee_id, 'project_assignment', 'New Project Assignment', 
       `You have been assigned to project "${project.rows[0].name}"`,
       req.params.id, 'project']
    );
    
    res.json({ message: 'Employee assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id/assign/:employeeId', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can remove employees' });
  try {
    await pool.query('DELETE FROM project_assignments WHERE project_id = $1 AND employee_id = $2', 
      [req.params.id, req.params.employeeId]);
    res.json({ message: 'Employee removed from project' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:id/skills', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can add skills' });
  try {
    const { skill_id } = req.body;
    await pool.query('INSERT INTO project_skills (project_id, skill_id) VALUES ($1, $2)', 
      [req.params.id, skill_id]);
    res.json({ message: 'Skill added to project' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id/skills/:skillId', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can remove skills' });
  try {
    await pool.query('DELETE FROM project_skills WHERE project_id = $1 AND skill_id = $2', 
      [req.params.id, req.params.skillId]);
    res.json({ message: 'Skill removed from project' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TASKS ROUTES ==========
app.get('/api/tasks/my', auth, async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Only employees can view tasks' });
  try {
    const result = await pool.query(`
      SELECT st.*, s.name as skill_name, s.description as skill_description, p.name as project_name
      FROM skill_tasks st
      JOIN skills s ON st.skill_id = s.id
      JOIN projects p ON st.project_id = p.id
      WHERE st.employee_id = $1 AND st.status != 'completed'
      ORDER BY st.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/stats', auth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'employee') {
      result = await pool.query(`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          (SELECT COUNT(*) FROM project_assignments WHERE employee_id = $1) as project_count
        FROM skill_tasks
        WHERE employee_id = $1
      `, [req.user.id]);
    } else {
      result = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM projects WHERE created_by = $1) as project_count,
          (SELECT COUNT(*) FROM project_assignments 
           WHERE project_id IN (SELECT id FROM projects WHERE created_by = $1)) as total_assignments
      `, [req.user.id]);
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/project/:projectId', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT st.*, u.name as employee_name, s.name as skill_name
      FROM skill_tasks st
      JOIN users u ON st.employee_id = u.id
      JOIN skills s ON st.skill_id = s.id
      WHERE st.project_id = $1
    `, [req.params.projectId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/project/:projectId/progress', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) as total,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 2)
          ELSE 0
        END as percentage
      FROM skill_tasks
      WHERE project_id = $1
    `, [req.params.projectId]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id/complete', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE skill_tasks SET status = $1, completed_at = NOW() WHERE id = $2',
      ['completed', req.params.id]
    );
    res.json({ message: 'Task marked as completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SKILL GAPS ROUTES ==========
app.get('/api/skill-gaps', auth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'employee') {
      result = await pool.query(`
        SELECT sg.*, s.name as skill_name, p.name as project_name
        FROM skill_gaps sg
        JOIN skills s ON sg.skill_id = s.id
        JOIN projects p ON sg.project_id = p.id
        WHERE sg.employee_id = $1
        ORDER BY sg.created_at DESC
      `, [req.user.id]);
    } else {
      result = await pool.query(`
        SELECT sg.*, s.name as skill_name, p.name as project_name, u.name as employee_name
        FROM skill_gaps sg
        JOIN skills s ON sg.skill_id = s.id
        JOIN projects p ON sg.project_id = p.id
        JOIN users u ON sg.employee_id = u.id
        ORDER BY sg.created_at DESC
      `);
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/skill-gaps/my', auth, async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Only for employees' });
  try {
    const result = await pool.query(`
      SELECT sg.*, s.name as skill_name, s.description as skill_description, p.name as project_name
      FROM skill_gaps sg
      JOIN skills s ON sg.skill_id = s.id
      JOIN projects p ON sg.project_id = p.id
      WHERE sg.employee_id = $1 AND sg.status = 'pending'
      ORDER BY sg.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TRAININGS ROUTES ==========
app.get('/api/trainings', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, s.name as skill_name
      FROM trainings t
      JOIN skills s ON t.skill_id = s.id
      ORDER BY t.name
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trainings/skill/:skillId', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trainings WHERE skill_id = $1 ORDER BY id', [req.params.skillId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/trainings', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only managers can create trainings' });
  try {
    const { skill_id, name, description, duration_hours, content_url } = req.body;
    const result = await pool.query(
      'INSERT INTO trainings (skill_id, name, description, duration_hours, content_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [skill_id, name, description, duration_hours, content_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TRAINING PROGRESS ROUTES ==========
app.get('/api/training-progress', auth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'employee') {
      result = await pool.query(`
        SELECT tp.*, t.name as training_name, t.description, t.duration_hours, s.name as skill_name, p.name as project_name
        FROM training_progress tp
        JOIN trainings t ON tp.training_id = t.id
        JOIN skills s ON t.skill_id = s.id
        LEFT JOIN projects p ON tp.project_id = p.id
        WHERE tp.employee_id = $1
        ORDER BY tp.created_at DESC
      `, [req.user.id]);
    } else {
      result = await pool.query(`
        SELECT tp.*, t.name as training_name, s.name as skill_name, u.name as employee_name, p.name as project_name
        FROM training_progress tp
        JOIN trainings t ON tp.training_id = t.id
        JOIN skills s ON t.skill_id = s.id
        JOIN users u ON tp.employee_id = u.id
        LEFT JOIN projects p ON tp.project_id = p.id
        ORDER BY tp.created_at DESC
      `);
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/training-progress/my', auth, async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Only for employees' });
  try {
    const result = await pool.query(`
      SELECT tp.*, t.name as training_name, t.description, t.duration_hours, s.name as skill_name, p.name as project_name
      FROM training_progress tp
      JOIN trainings t ON tp.training_id = t.id
      JOIN skills s ON t.skill_id = s.id
      LEFT JOIN projects p ON tp.project_id = p.id
      WHERE tp.employee_id = $1
      ORDER BY 
        CASE tp.status 
          WHEN 'in_progress' THEN 1 
          WHEN 'assigned' THEN 2 
          WHEN 'completed' THEN 3 
        END,
        tp.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/training-progress', auth, async (req, res) => {
  try {
    const { training_id, project_id, status } = req.body;
    const result = await pool.query(
      'INSERT INTO training_progress (employee_id, training_id, project_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT (employee_id, training_id, project_id) DO UPDATE SET status = $4 RETURNING *',
      [req.user.id, training_id, project_id, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/training-progress/:id/complete', auth, async (req, res) => {
  try {
    // Update training progress
    await pool.query(
      'UPDATE training_progress SET status = $1, completed_at = NOW(), progress_percentage = 100 WHERE id = $2',
      ['completed', req.params.id]
    );
    
    // Get training info
    const tp = await pool.query(`
      SELECT tp.*, t.skill_id, t.name as training_name, s.name as skill_name
      FROM training_progress tp
      JOIN trainings t ON tp.training_id = t.id
      JOIN skills s ON t.skill_id = s.id
      WHERE tp.id = $1
    `, [req.params.id]);
    
    if (tp.rows[0]) {
      // Add skill to employee
      await pool.query(
        'INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, $3) ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = $3',
        [req.user.id, tp.rows[0].skill_id, 'beginner']
      );
      
      // Update skill gap status
      await pool.query(
        'UPDATE skill_gaps SET status = $1 WHERE employee_id = $2 AND skill_id = $3',
        ['resolved', req.user.id, tp.rows[0].skill_id]
      );
      
      // Check for next training in sequence
      const nextTraining = await pool.query(`
        SELECT t.id, t.name
        FROM trainings t
        WHERE t.skill_id = $1 AND t.id > $2
        ORDER BY t.id
        LIMIT 1
      `, [tp.rows[0].skill_id, tp.rows[0].training_id]);
      
      if (nextTraining.rows[0]) {
        // Auto-assign next training
        await pool.query(
          'INSERT INTO training_progress (employee_id, training_id, project_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [req.user.id, nextTraining.rows[0].id, tp.rows[0].project_id, 'assigned']
        );
        
        // Create notification
        await pool.query(
          'INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type) VALUES ($1, $2, $3, $4, $5, $6)',
          [req.user.id, 'training_assigned', 'New Training Assigned',
           `Complete "${nextTraining.rows[0].name}" to continue mastering ${tp.rows[0].skill_name}`,
           nextTraining.rows[0].id, 'training']
        );
      }
    }
    
    res.json({ message: 'Training completed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/training-progress/:id/start', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE training_progress SET status = $1, started_at = NOW() WHERE id = $2',
      ['in_progress', req.params.id]
    );
    res.json({ message: 'Training started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== NOTIFICATIONS ROUTES ==========
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const { unread_only } = req.query;
    let query = `
      SELECT n.*, s.name as skill_name, p.name as project_name
      FROM notifications n
      LEFT JOIN skills s ON n.reference_type = 'skill' AND n.reference_id = s.id
      LEFT JOIN projects p ON n.reference_type = 'project' AND n.reference_id = p.id
      WHERE n.user_id = $1
    `;
    
    if (unread_only === 'true') {
      query += ' AND n.read = false';
    }
    
    query += ' ORDER BY n.created_at DESC';
    
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', 
      [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', 
      [req.params.id, req.user.id]);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== EMPLOYEE DASHBOARD DATA ==========
app.get('/api/dashboard/employee', auth, async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Only for employees' });
  try {
    // Get user skills
    const skills = await pool.query(`
      SELECT us.*, s.name as skill_name, s.description, s.category
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      WHERE us.user_id = $1
    `, [req.user.id]);
    
    // Get assigned projects
    const projects = await pool.query(`
      SELECT p.*, 
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as required_skills
      FROM projects p
      JOIN project_assignments pa ON p.id = pa.project_id
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      WHERE pa.employee_id = $1
      GROUP BY p.id
    `, [req.user.id]);
    
    // Get skill gaps
    const skillGaps = await pool.query(`
      SELECT sg.*, s.name as skill_name, p.name as project_name
      FROM skill_gaps sg
      JOIN skills s ON sg.skill_id = s.id
      JOIN projects p ON sg.project_id = p.id
      WHERE sg.employee_id = $1 AND sg.status = 'pending'
    `, [req.user.id]);
    
    // Get training progress
    const trainings = await pool.query(`
      SELECT tp.*, t.name as training_name, t.duration_hours, s.name as skill_name, p.name as project_name
      FROM training_progress tp
      JOIN trainings t ON tp.training_id = t.id
      JOIN skills s ON t.skill_id = s.id
      LEFT JOIN projects p ON tp.project_id = p.id
      WHERE tp.employee_id = $1
      ORDER BY 
        CASE tp.status 
          WHEN 'in_progress' THEN 1 
          WHEN 'assigned' THEN 2 
          WHEN 'completed' THEN 3 
        END
    `, [req.user.id]);
    
    // Get unread notifications count
    const notifications = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );
    
    res.json({
      skills: skills.rows,
      projects: projects.rows,
      skillGaps: skillGaps.rows,
      trainings: trainings.rows,
      unreadNotifications: parseInt(notifications.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== MANAGER DASHBOARD DATA ==========
app.get('/api/dashboard/manager', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Only for managers' });
  try {
    // Get projects created by manager
    const projects = await pool.query(`
      SELECT p.*, 
        COALESCE(
          json_agg(
            json_build_object('id', s.id, 'name', s.name)
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) as required_skills,
        (SELECT COUNT(*) FROM project_assignments WHERE project_id = p.id) as employee_count
      FROM projects p
      LEFT JOIN project_skills ps ON p.id = ps.project_id
      LEFT JOIN skills s ON ps.skill_id = s.id
      WHERE p.created_by = $1
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    
    // Get all employees with their skills
    const employees = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
        COALESCE(
          json_agg(
            json_build_object('skill_id', us.skill_id, 'skill_name', s.name, 'proficiency_level', us.proficiency_level)
          ) FILTER (WHERE us.skill_id IS NOT NULL), '[]'
        ) as skills,
        (SELECT COUNT(*) FROM project_assignments WHERE employee_id = u.id) as project_count
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE u.role = 'employee'
      GROUP BY u.id
      ORDER BY u.name
    `);
    
    // Get all skill gaps across employees
    const skillGaps = await pool.query(`
      SELECT sg.*, s.name as skill_name, p.name as project_name, u.name as employee_name
      FROM skill_gaps sg
      JOIN skills s ON sg.skill_id = s.id
      JOIN projects p ON sg.project_id = p.id
      JOIN users u ON sg.employee_id = u.id
      WHERE p.created_by = $1 AND sg.status = 'pending'
      ORDER BY sg.created_at DESC
      LIMIT 20
    `, [req.user.id]);
    
    // Get stats
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE created_by = $1) as total_projects,
        (SELECT COUNT(*) FROM users WHERE role = 'employee') as total_employees,
        (SELECT COUNT(*) FROM project_assignments 
         WHERE project_id IN (SELECT id FROM projects WHERE created_by = $1)) as total_assignments,
        (SELECT COUNT(*) FROM skill_gaps sg
         JOIN projects p ON sg.project_id = p.id
         WHERE p.created_by = $1 AND sg.status = 'pending') as pending_skill_gaps
    `, [req.user.id]);
    
    res.json({
      projects: projects.rows,
      employees: employees.rows,
      skillGaps: skillGaps.rows,
      stats: stats.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== DATABASE INITIALIZATION ==========
app.post('/api/init-db', async (req, res) => {
  try {
    // Create tables manually to ensure they exist
    const createTablesSQL = `
      -- Create tables if they don't exist
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('manager', 'employee')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS skills (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          category VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_skills (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
          proficiency_level VARCHAR(20) DEFAULT 'beginner' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
          acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, skill_id)
      );

      CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_skills (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
          required_count INTEGER DEFAULT 1,
          UNIQUE(project_id, skill_id)
      );

      CREATE TABLE IF NOT EXISTS project_assignments (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          assigned_by INTEGER REFERENCES users(id),
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, employee_id)
      );

      CREATE TABLE IF NOT EXISTS skill_tasks (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
          assigned_by INTEGER REFERENCES users(id),
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          UNIQUE(project_id, employee_id, skill_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          reference_id INTEGER,
          reference_type VARCHAR(50),
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS skill_gaps (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP,
          UNIQUE(employee_id, project_id, skill_id)
      );

      CREATE TABLE IF NOT EXISTS trainings (
          id SERIAL PRIMARY KEY,
          skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          description TEXT,
          duration_hours INTEGER DEFAULT 10,
          content_url TEXT,
          difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS training_progress (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          training_id INTEGER REFERENCES trainings(id) ON DELETE CASCADE,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
          progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          UNIQUE(employee_id, training_id, project_id)
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
      CREATE INDEX IF NOT EXISTS idx_project_skills_project ON project_skills(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_assignments_employee ON project_assignments(employee_id);
      CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
      CREATE INDEX IF NOT EXISTS idx_skill_tasks_employee ON skill_tasks(employee_id);
      CREATE INDEX IF NOT EXISTS idx_skill_tasks_status ON skill_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_skill_gaps_employee ON skill_gaps(employee_id);
      CREATE INDEX IF NOT EXISTS idx_skill_gaps_project ON skill_gaps(project_id);
      CREATE INDEX IF NOT EXISTS idx_skill_gaps_status ON skill_gaps(status);
      CREATE INDEX IF NOT EXISTS idx_trainings_skill ON trainings(skill_id);
      CREATE INDEX IF NOT EXISTS idx_training_progress_employee ON training_progress(employee_id);
      CREATE INDEX IF NOT EXISTS idx_training_progress_status ON training_progress(status);
    `;
    
    await pool.query(createTablesSQL);
    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database init error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/seed-db', async (req, res) => {
  try {
    // Step 1: Insert users
    await pool.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
      ('Rahul Manager', 'manager@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),
      ('Amit Kumar', 'amit@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee'),
      ('Neha Sharma', 'neha@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee'),
      ('Arjun Patel', 'arjun@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee')
      ON CONFLICT (email) DO NOTHING
    `);
    
    // Step 2: Insert skills
    await pool.query(`
      INSERT INTO skills (name, description, category) VALUES
      ('JavaScript', 'Programming language for web development', 'Frontend'),
      ('React', 'JavaScript library for building user interfaces', 'Frontend'),
      ('Node.js', 'JavaScript runtime for server-side development', 'Backend'),
      ('Python', 'General-purpose programming language', 'Backend'),
      ('SQL', 'Structured Query Language for databases', 'Database'),
      ('Flutter', 'UI toolkit for building natively compiled applications', 'Mobile'),
      ('Firebase', 'Google mobile platform', 'Mobile'),
      ('Kotlin', 'Modern programming language for Android development', 'Mobile')
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Step 3: Get IDs
    const managerResult = await pool.query("SELECT id FROM users WHERE email = 'manager@company.com'");
    const amitResult = await pool.query("SELECT id FROM users WHERE email = 'amit@company.com'");
    const nehaResult = await pool.query("SELECT id FROM users WHERE email = 'neha@company.com'");
    const arjunResult = await pool.query("SELECT id FROM users WHERE email = 'arjun@company.com'");
    
    const managerId = managerResult.rows[0]?.id;
    const amitId = amitResult.rows[0]?.id;
    const nehaId = nehaResult.rows[0]?.id;
    const arjunId = arjunResult.rows[0]?.id;
    
    const skillsResult = await pool.query("SELECT id, name FROM skills");
    const skills = {};
    skillsResult.rows.forEach(s => skills[s.name] = s.id);
    
    // Step 4: Assign skills to employees
    if (amitId && skills['JavaScript']) {
      await pool.query(
        "INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, 'intermediate') ON CONFLICT DO NOTHING",
        [amitId, skills['JavaScript']]
      );
    }
    if (amitId && skills['React']) {
      await pool.query(
        "INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, 'beginner') ON CONFLICT DO NOTHING",
        [amitId, skills['React']]
      );
    }
    if (nehaId && skills['Python']) {
      await pool.query(
        "INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, 'intermediate') ON CONFLICT DO NOTHING",
        [nehaId, skills['Python']]
      );
    }
    if (nehaId && skills['SQL']) {
      await pool.query(
        "INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, 'advanced') ON CONFLICT DO NOTHING",
        [nehaId, skills['SQL']]
      );
    }
    if (arjunId && skills['Flutter']) {
      await pool.query(
        "INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES ($1, $2, 'beginner') ON CONFLICT DO NOTHING",
        [arjunId, skills['Flutter']]
      );
    }
    
    // Step 5: Create projects
    await pool.query(`
      INSERT INTO projects (name, description, status, created_by) VALUES
      ('Mobile Banking App', 'A secure mobile banking application', 'active', $1),
      ('E-commerce Platform', 'Full-stack e-commerce solution', 'pending', $1),
      ('AI Dashboard', 'Analytics dashboard with ML insights', 'active', $1)
      ON CONFLICT DO NOTHING
    `, [managerId]);
    
    const projects = {};
    const allProjects = await pool.query("SELECT id, name FROM projects WHERE created_by = $1", [managerId]);
    allProjects.rows.forEach(p => projects[p.name] = p.id);
    
    // Step 6: Add required skills to projects
    const projectSkillsData = [
      [projects['Mobile Banking App'], skills['Flutter']],
      [projects['Mobile Banking App'], skills['Firebase']],
      [projects['Mobile Banking App'], skills['Kotlin']],
      [projects['E-commerce Platform'], skills['React']],
      [projects['E-commerce Platform'], skills['Node.js']],
      [projects['E-commerce Platform'], skills['SQL']],
      [projects['AI Dashboard'], skills['Python']],
      [projects['AI Dashboard'], skills['SQL']],
      [projects['AI Dashboard'], skills['React']]
    ];
    
    for (const [pid, sid] of projectSkillsData) {
      if (pid && sid) {
        await pool.query(
          "INSERT INTO project_skills (project_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [pid, sid]
        );
      }
    }
    
    // Step 7: Assign employees to projects
    const assignments = [
      [projects['E-commerce Platform'], amitId],
      [projects['AI Dashboard'], amitId],
      [projects['AI Dashboard'], nehaId],
      [projects['Mobile Banking App'], arjunId]
    ];
    
    for (const [pid, eid] of assignments) {
      if (pid && eid && managerId) {
        await pool.query(
          "INSERT INTO project_assignments (project_id, employee_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
          [pid, eid, managerId]
        );
      }
    }
    
    // Step 8: Create skill gaps
    const skillGaps = [
      [amitId, projects['E-commerce Platform'], skills['SQL']],
      [amitId, projects['AI Dashboard'], skills['Python']],
      [nehaId, projects['AI Dashboard'], skills['React']],
      [arjunId, projects['Mobile Banking App'], skills['Kotlin']]
    ];
    
    for (const [eid, pid, sid] of skillGaps) {
      if (eid && pid && sid) {
        await pool.query(
          "INSERT INTO skill_gaps (employee_id, project_id, skill_id, status) VALUES ($1, $2, $3, 'pending') ON CONFLICT DO NOTHING",
          [eid, pid, sid]
        );
      }
    }
    
    // Step 9: Create sample notifications
    const notifications = [
      [amitId, 'project_assignment', 'New Project', 'Assigned to E-commerce Platform'],
      [amitId, 'skill_gap', 'Skill Gap', 'Learn SQL for E-commerce'],
      [nehaId, 'project_assignment', 'New Project', 'Assigned to AI Dashboard'],
      [arjunId, 'project_assignment', 'New Project', 'Assigned to Mobile Banking']
    ];
    
    for (const [uid, type, title, message] of notifications) {
      if (uid) {
        await pool.query(
          "INSERT INTO notifications (user_id, type, title, message, read) VALUES ($1, $2, $3, $4, false) ON CONFLICT DO NOTHING",
          [uid, type, title, message]
        );
      }
    }
    
    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Database seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
