const { query } = require('../config/database');

// Get my notifications
const getMyNotifications = async (req, res) => {
  try {
    const { unread_only = false } = req.query;

    let sql = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    
    if (unread_only === 'true') {
      sql += ' AND read = false';
    }
    
    sql += ' ORDER BY created_at DESC LIMIT 50';

    const result = await query(sql, [req.user.id]);

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE notifications 
      SET read = true 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
      [req.user.id]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Create notification (internal use)
const createNotification = async (userId, type, title, message, referenceId = null, referenceType = null) => {
  try {
    await query(`
      INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, type, title, message, referenceId, referenceType]);
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification
};