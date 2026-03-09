const { query } = require('../config/database');

// Get my tasks (employee)
const getMyTasks = async (req, res) => {
  try {
    const result = await query(`
      SELECT st.*, 
        s.name as skill_name, 
        s.description as skill_description,
        s.category as skill_category,
        p.name as project_name,
        p.status as project_status
      FROM skill_tasks st
      JOIN skills s ON st.skill_id = s.id
      JOIN projects p ON st.project_id = p.id
      WHERE st.employee_id = $1
      ORDER BY st.assigned_at DESC
    `, [req.user.id]);

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
};

// Get tasks by project
const getTasksByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await query(`
      SELECT st.*, 
        s.name as skill_name,
        u.name as employee_name,
        u.email as employee_email
      FROM skill_tasks st
      JOIN skills s ON st.skill_id = s.id
      JOIN users u ON st.employee_id = u.id
      WHERE st.project_id = $1
      ORDER BY u.name, s.name
    `, [projectId]);

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get project tasks error:', error);
    res.status(500).json({ error: 'Failed to get project tasks' });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT st.*, 
        s.name as skill_name, 
        s.description as skill_description,
        p.name as project_name,
        p.description as project_description
      FROM skill_tasks st
      JOIN skills s ON st.skill_id = s.id
      JOIN projects p ON st.project_id = p.id
      WHERE st.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
};

// Mark task as completed (employee)
const completeTask = async (req, res) => {
  const client = await query.bind({});

  try {
    const { id } = req.params;

    // Check if task belongs to the employee
    const taskCheck = await query(
      'SELECT * FROM skill_tasks WHERE id = $1 AND employee_id = $2',
      [id, req.user.id]
    );

    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    if (taskCheck.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Task is already completed' });
    }

    // Update task status
    const result = await query(`
      UPDATE skill_tasks 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    const task = result.rows[0];

    // Delete related notification
    await query(`
      DELETE FROM notifications 
      WHERE user_id = $1 
        AND reference_id = $2 
        AND reference_type = 'skill_task'
        AND type = 'skill_task'
    `, [req.user.id, task.project_id]);

    res.json({
      message: 'Task completed successfully',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
};

// Get task statistics for employee dashboard
const getTaskStats = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(DISTINCT project_id) as project_count
      FROM skill_tasks
      WHERE employee_id = $1
    `, [req.user.id]);

    res.json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Failed to get task statistics' });
  }
};

// Get project progress (manager view)
const getProjectProgress = async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await query(`
      SELECT 
        u.id as employee_id,
        u.name as employee_name,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE st.status = 'completed') as completed_tasks,
        ROUND(
          (COUNT(*) FILTER (WHERE st.status = 'completed')::decimal / COUNT(*)::decimal) * 100, 
          1
        ) as completion_percentage
      FROM skill_tasks st
      JOIN users u ON st.employee_id = u.id
      WHERE st.project_id = $1
      GROUP BY u.id, u.name
      ORDER BY u.name
    `, [projectId]);

    res.json({ progress: result.rows });
  } catch (error) {
    console.error('Get project progress error:', error);
    res.status(500).json({ error: 'Failed to get project progress' });
  }
};

module.exports = {
  getMyTasks,
  getTasksByProject,
  getTaskById,
  completeTask,
  getTaskStats,
  getProjectProgress
};