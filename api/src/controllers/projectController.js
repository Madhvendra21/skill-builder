const { query, getClient } = require('../config/database');

// Get all projects (filtered by role)
const getAllProjects = async (req, res) => {
  try {
    let result;

    if (req.user.role === 'manager') {
      // Managers see all projects they created
      result = await query(`
        SELECT p.*, 
          creator.name as creator_name,
          (SELECT COUNT(DISTINCT employee_id) FROM project_assignments WHERE project_id = p.id) as assigned_count,
          (SELECT COUNT(*) FROM project_skills WHERE project_id = p.id) as skill_count
        FROM projects p
        LEFT JOIN users creator ON p.created_by = creator.id
        ORDER BY p.created_at DESC
      `);
    } else {
      // Employees see projects they are assigned to
      result = await query(`
        SELECT p.*, 
          creator.name as creator_name,
          pa.assigned_at
        FROM projects p
        JOIN project_assignments pa ON p.id = pa.project_id
        LEFT JOIN users creator ON p.created_by = creator.id
        WHERE pa.employee_id = $1
        ORDER BY pa.assigned_at DESC
      `, [req.user.id]);
    }

    res.json({ projects: result.rows });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
};

// Get project by ID with details
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get project details
    const projectResult = await query(`
      SELECT p.*, creator.name as creator_name
      FROM projects p
      LEFT JOIN users creator ON p.created_by = creator.id
      WHERE p.id = $1
    `, [id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get required skills
    const skillsResult = await query(`
      SELECT ps.*, s.name, s.description, s.category
      FROM project_skills ps
      JOIN skills s ON ps.skill_id = s.id
      WHERE ps.project_id = $1
    `, [id]);

    // Get assigned employees
    const employeesResult = await query(`
      SELECT u.id, u.name, u.email, pa.assigned_at
      FROM project_assignments pa
      JOIN users u ON pa.employee_id = u.id
      WHERE pa.project_id = $1
      ORDER BY u.name
    `, [id]);

    res.json({
      project: {
        ...projectResult.rows[0],
        required_skills: skillsResult.rows,
        assigned_employees: employeesResult.rows
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
};

// Create new project (manager only)
const createProject = async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const { name, description, status = 'active', skills } = req.body;

    if (!name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Insert project
    const projectResult = await client.query(
      'INSERT INTO projects (name, description, status, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, status, req.user.id]
    );

    const project = projectResult.rows[0];

    // Add required skills if provided
    if (skills && skills.length > 0) {
      for (const skill of skills) {
        await client.query(
          'INSERT INTO project_skills (project_id, skill_id, required_count) VALUES ($1, $2, $3)',
          [project.id, skill.skill_id, skill.required_count || 1]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
};

// Update project (manager only)
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const result = await query(`
      UPDATE projects 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [name, description, status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Project updated successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete project (manager only)
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

// Assign employee to project (manager only)
const assignEmployee = async (req, res) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    const { id } = req.params; // project id
    const { employee_id } = req.body;

    if (!employee_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    // Check if employee exists
    const employeeCheck = await client.query(
      'SELECT id, name FROM users WHERE id = $1 AND role = $2',
      [employee_id, 'employee']
    );

    if (employeeCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if already assigned
    const assignmentCheck = await client.query(
      'SELECT id FROM project_assignments WHERE project_id = $1 AND employee_id = $2',
      [id, employee_id]
    );

    if (assignmentCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Employee already assigned to this project' });
    }

    // Create assignment
    await client.query(
      'INSERT INTO project_assignments (project_id, employee_id, assigned_by) VALUES ($1, $2, $3)',
      [id, employee_id, req.user.id]
    );

    // Get project name for notification
    const projectResult = await client.query('SELECT name FROM projects WHERE id = $1', [id]);
    const projectName = projectResult.rows[0]?.name || 'Unknown Project';

    // Get required skills for this project
    const skillsResult = await client.query(
      'SELECT skill_id FROM project_skills WHERE project_id = $1',
      [id]
    );

    // Create skill tasks for the employee
    for (const skill of skillsResult.rows) {
      await client.query(
        'INSERT INTO skill_tasks (project_id, employee_id, skill_id, assigned_by) VALUES ($1, $2, $3, $4)',
        [id, employee_id, skill.skill_id, req.user.id]
      );

      // Get skill name
      const skillResult = await client.query('SELECT name FROM skills WHERE id = $1', [skill.skill_id]);
      const skillName = skillResult.rows[0]?.name || 'Unknown Skill';

      // Create notification for each skill task
      await client.query(`
        INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        employee_id,
        'skill_task',
        `New skill task assigned`,
        `You have been assigned to work on "${skillName}" skill for project "${projectName}". Please complete this task.`,
        id,
        'skill_task'
      ]);
    }

    await client.query('COMMIT');

    res.json({
      message: 'Employee assigned successfully',
      employee: employeeCheck.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assign employee error:', error);
    res.status(500).json({ error: 'Failed to assign employee' });
  } finally {
    client.release();
  }
};

// Remove employee from project (manager only)
const removeEmployee = async (req, res) => {
  try {
    const { id, employeeId } = req.params;

    // Remove assignment
    const assignmentResult = await query(
      'DELETE FROM project_assignments WHERE project_id = $1 AND employee_id = $2 RETURNING *',
      [id, employeeId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Remove skill tasks
    await query(
      'DELETE FROM skill_tasks WHERE project_id = $1 AND employee_id = $2',
      [id, employeeId]
    );

    // Remove related notifications
    await query(
      'DELETE FROM notifications WHERE user_id = $1 AND reference_id = $2 AND reference_type = $3',
      [employeeId, parseInt(id), 'skill_task']
    );

    res.json({ message: 'Employee removed from project' });
  } catch (error) {
    console.error('Remove employee error:', error);
    res.status(500).json({ error: 'Failed to remove employee' });
  }
};

// Add skill requirement to project (manager only)
const addProjectSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skill_id, required_count = 1 } = req.body;

    if (!skill_id) {
      return res.status(400).json({ error: 'Skill ID is required' });
    }

    // Check if skill exists
    const skillCheck = await query('SELECT id, name FROM skills WHERE id = $1', [skill_id]);
    if (skillCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Add or update project skill
    const result = await query(`
      INSERT INTO project_skills (project_id, skill_id, required_count)
      VALUES ($1, $2, $3)
      ON CONFLICT (project_id, skill_id)
      DO UPDATE SET required_count = $3
      RETURNING *
    `, [id, skill_id, required_count]);

    res.json({
      message: 'Skill added to project',
      projectSkill: {
        ...result.rows[0],
        skill_name: skillCheck.rows[0].name
      }
    });
  } catch (error) {
    console.error('Add project skill error:', error);
    res.status(500).json({ error: 'Failed to add skill to project' });
  }
};

// Remove skill from project (manager only)
const removeProjectSkill = async (req, res) => {
  try {
    const { id, skillId } = req.params;

    const result = await query(
      'DELETE FROM project_skills WHERE project_id = $1 AND skill_id = $2 RETURNING *',
      [id, skillId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project skill not found' });
    }

    // Also remove related skill tasks
    await query(
      'DELETE FROM skill_tasks WHERE project_id = $1 AND skill_id = $2',
      [id, skillId]
    );

    res.json({ message: 'Skill removed from project' });
  } catch (error) {
    console.error('Remove project skill error:', error);
    res.status(500).json({ error: 'Failed to remove skill from project' });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  assignEmployee,
  removeEmployee,
  addProjectSkill,
  removeProjectSkill
};