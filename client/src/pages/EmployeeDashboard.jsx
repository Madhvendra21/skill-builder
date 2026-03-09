import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { tasksAPI, projectsAPI } from '../services/api';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, refreshNotifications } = useNotifications();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total_tasks: 0, pending_tasks: 0, completed_tasks: 0, project_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, projectsRes, statsRes] = await Promise.all([
        tasksAPI.getMy(),
        projectsAPI.getAll(),
        tasksAPI.getStats()
      ]);
      setTasks(tasksRes.data.tasks || []);
      setProjects(projectsRes.data.projects || []);
      setStats(statsRes.data.stats || { total_tasks: 0, pending_tasks: 0, completed_tasks: 0, project_count: 0 });
      setError('');
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    refreshNotifications();
    // Auto-refresh every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchData();
      refreshNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData, refreshNotifications]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await tasksAPI.complete(taskId);
      fetchData();
      refreshNotifications();
      showToast('Task completed successfully! Notification cleared.');
    } catch (error) {
      console.error('Failed to complete task:', error);
      showToast(error.response?.data?.error || 'Failed to complete task', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: '#22c55e',
      pending: '#f59e0b',
      completed: '#3b82f6',
      cancelled: '#ef4444'
    };
    return { backgroundColor: colors[status] || '#6b7280', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' };
  };

  const getTaskStatusBadge = (status) => {
    const colors = {
      pending: '#f59e0b',
      completed: '#22c55e'
    };
    return { backgroundColor: colors[status] || '#6b7280', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' };
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div style={{ ...styles.toast, backgroundColor: toast.type === 'error' ? '#ef4444' : '#22c55e' }}>
          {toast.message}
        </div>
      )}

      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Employee Dashboard</h1>
        <div style={styles.headerRight}>
          <span style={styles.userName}>Welcome, {user?.name}</span>
          <button onClick={() => { fetchData(); refreshNotifications(); }} style={styles.refreshBtn}>🔄 Refresh</button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            style={styles.notificationBtn}
          >
            🔔 {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
          </button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>

        {showNotifications && (
          <div style={styles.notificationDropdown}>
            <h4 style={styles.notificationTitle}>Notifications</h4>
            {notifications.length === 0 ? (
              <p style={styles.noNotifications}>No notifications</p>
            ) : (
              notifications.slice(0, 5).map(notification => (
                <div 
                  key={notification.id} 
                  style={{ ...styles.notificationItem, ...(notification.read ? {} : styles.unread) }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <p style={styles.notificationText}>{notification.title}</p>
                  <p style={styles.notificationMessage}>{notification.message}</p>
                </div>
              ))
            )}
          </div>
        )}
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{stats.project_count || 0}</h3>
          <p style={styles.statLabel}>Assigned Projects</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{stats.total_tasks || 0}</h3>
          <p style={styles.statLabel}>Total Tasks</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={{ ...styles.statNumber, color: '#f59e0b' }}>{stats.pending_tasks || 0}</h3>
          <p style={styles.statLabel}>Pending Tasks</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={{ ...styles.statNumber, color: '#22c55e' }}>{stats.completed_tasks || 0}</h3>
          <p style={styles.statLabel}>Completed Tasks</p>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>My Tasks {tasks.length > 0 && `(${tasks.length})`}</h2>
          <div style={styles.taskList}>
            {tasks.length === 0 ? (
              <p style={styles.emptyMessage}>No tasks assigned yet. When a manager assigns you to a project, tasks will appear here.</p>
            ) : (
              tasks.map(task => (
                <div key={task.id} style={styles.taskCard}>
                  <div style={styles.taskHeader}>
                    <div>
                      <h4 style={styles.taskSkill}>{task.skill_name}</h4>
                      <p style={styles.taskProject}>Project: {task.project_name}</p>
                    </div>
                    <span style={getTaskStatusBadge(task.status)}>{task.status}</span>
                  </div>
                  <p style={styles.taskDescription}>{task.skill_description}</p>
                  {task.status === 'pending' && (
                    <button 
                      onClick={() => handleCompleteTask(task.id)}
                      style={styles.completeBtn}
                    >
                      ✓ Mark as Completed
                    </button>
                  )}
                  {task.status === 'completed' && task.completed_at && (
                    <p style={styles.completedDate}>✓ Completed: {new Date(task.completed_at).toLocaleDateString()}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>My Projects {projects.length > 0 && `(${projects.length})`}</h2>
          <div style={styles.projectGrid}>
            {projects.length === 0 ? (
              <p style={styles.emptyMessage}>No projects assigned yet. Your manager will assign you to projects based on your skills.</p>
            ) : (
              projects.map(project => (
                <div key={project.id} style={styles.projectCard}>
                  <h4 style={styles.projectName}>{project.name}</h4>
                  <p style={styles.projectDescription}>{project.description}</p>
                  <span style={getStatusBadge(project.status)}>{project.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
  },
  header: {
    backgroundColor: '#1a73e8',
    color: 'white',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative'
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userName: {
    fontSize: '14px'
  },
  refreshBtn: {
    backgroundColor: 'transparent',
    border: '1px solid white',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  notificationBtn: {
    position: 'relative',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer'
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px'
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  notificationDropdown: {
    position: 'absolute',
    top: '100%',
    right: '80px',
    width: '320px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 1000,
    maxHeight: '400px',
    overflowY: 'auto'
  },
  notificationTitle: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    color: '#333',
    margin: 0
  },
  noNotifications: {
    padding: '20px',
    color: '#666',
    textAlign: 'center'
  },
  notificationItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer'
  },
  unread: {
    backgroundColor: '#f0f9ff'
  },
  notificationText: {
    fontWeight: '500',
    color: '#333',
    marginBottom: '4px',
    margin: 0
  },
  notificationMessage: {
    fontSize: '12px',
    color: '#666',
    margin: 0
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px'
  },
  error: {
    backgroundColor: '#fee',
    color: '#c00',
    padding: '12px 24px',
    textAlign: 'center'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    padding: '24px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a73e8',
    margin: 0
  },
  statLabel: {
    color: '#666',
    marginTop: '8px',
    margin: 0
  },
  content: {
    padding: '0 24px 24px'
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    margin: 0
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  taskCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    transition: 'box-shadow 0.2s'
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  taskSkill: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: 0
  },
  taskProject: {
    fontSize: '12px',
    color: '#666',
    margin: 0
  },
  taskDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '12px',
    margin: 0
  },
  completeBtn: {
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  completedDate: {
    fontSize: '12px',
    color: '#22c55e',
    margin: 0
  },
  projectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px'
  },
  projectCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px'
  },
  projectName: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px',
    margin: 0
  },
  projectDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '12px',
    margin: 0
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    padding: '20px'
  }
};

export default EmployeeDashboard;