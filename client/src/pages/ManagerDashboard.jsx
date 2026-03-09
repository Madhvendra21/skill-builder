import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectsAPI, usersAPI, skillsAPI } from '../services/api';

const ManagerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, employeesRes, skillsRes] = await Promise.all([
        projectsAPI.getAll(),
        usersAPI.getEmployees(),
        skillsAPI.getAll()
      ]);
      setProjects(projectsRes.data || []);
      setEmployees(employeesRes.data || []);
      setSkills(skillsRes.data || []);
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
    // Auto-refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.create(newProject);
      setShowCreateProject(false);
      setNewProject({ name: '', description: '' });
      fetchData();
      showToast('Project created successfully!');
    } catch (error) {
      console.error('Failed to create project:', error);
      showToast('Failed to create project', 'error');
    }
  };

  const handleAssignEmployee = async (projectId, employeeId) => {
    try {
      await projectsAPI.assignEmployee(projectId, employeeId);
      setShowAssignModal(null);
      fetchData();
      showToast('Employee assigned successfully!');
    } catch (error) {
      console.error('Failed to assign employee:', error);
      showToast(error.response?.data?.error || 'Failed to assign employee', 'error');
    }
  };

  const handleAddSkillToProject = async (projectId, skillId) => {
    try {
      await projectsAPI.addSkill(projectId, skillId);
      fetchData();
      showToast('Skill added to project!');
    } catch (error) {
      console.error('Failed to add skill:', error);
      showToast('Failed to add skill', 'error');
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
        <h1 style={styles.headerTitle}>Manager Dashboard</h1>
        <div style={styles.headerRight}>
          <span style={styles.userName}>Welcome, {user?.name}</span>
          <button onClick={fetchData} style={styles.refreshBtn}>🔄 Refresh</button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{projects.length}</h3>
          <p style={styles.statLabel}>Total Projects</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{projects.filter(p => p.status === 'active').length}</h3>
          <p style={styles.statLabel}>Active Projects</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{employees.length}</h3>
          <p style={styles.statLabel}>Employees</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{skills.length}</h3>
          <p style={styles.statLabel}>Skills</p>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Projects</h2>
            <button onClick={() => setShowCreateProject(true)} style={styles.addButton}>
              + New Project
            </button>
          </div>

          {projects.length === 0 ? (
            <p style={styles.emptyMessage}>No projects yet. Create your first project!</p>
          ) : (
            <div style={styles.table}>
              <div style={styles.tableHeader}>
                <div style={{ ...styles.tableCell, flex: 2 }}>Project Name</div>
                <div style={{ ...styles.tableCell, flex: 1 }}>Status</div>
                <div style={{ ...styles.tableCell, flex: 1 }}>Skills</div>
                <div style={{ ...styles.tableCell, flex: 1 }}>Assigned</div>
                <div style={{ ...styles.tableCell, flex: 1 }}>Actions</div>
              </div>
              {projects.map(project => (
                <div key={project.id} style={styles.tableRow}>
                  <div style={{ ...styles.tableCell, flex: 2 }}>
                    <strong>{project.name}</strong>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{project.description}</p>
                  </div>
                  <div style={{ ...styles.tableCell, flex: 1 }}>
                    <span style={getStatusBadge(project.status)}>{project.status}</span>
                  </div>
                  <div style={{ ...styles.tableCell, flex: 1 }}>{project.skill_count || 0} skills</div>
                  <div style={{ ...styles.tableCell, flex: 1 }}>{project.assigned_count || 0} employees</div>
                  <div style={{ ...styles.tableCell, flex: 1 }}>
                    <button 
                      onClick={() => setShowAssignModal(project.id)}
                      style={styles.assignBtn}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Employees</h2>
          </div>

          {employees.length === 0 ? (
            <p style={styles.emptyMessage}>No employees registered yet.</p>
          ) : (
            <div style={styles.employeeGrid}>
              {employees.map(employee => (
                <div key={employee.id} style={styles.employeeCard}>
                  <h4 style={styles.employeeName}>{employee.name}</h4>
                  <p style={styles.employeeEmail}>{employee.email}</p>
                  <div style={styles.skillTags}>
                    {employee.skills?.slice(0, 3).map(skill => (
                      <span key={skill.id} style={styles.skillTag}>{skill.name}</span>
                    ))}
                    {employee.skills?.length > 3 && (
                      <span style={styles.skillTag}>+{employee.skills.length - 3}</span>
                    )}
                    {(!employee.skills || employee.skills.length === 0) && (
                      <span style={{ ...styles.skillTag, backgroundColor: '#fee', color: '#666' }}>No skills</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateProject && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  style={{ ...styles.input, minHeight: '80px' }}
                />
              </div>
              <div style={styles.buttonGroup}>
                <button type="submit" style={styles.submitBtn}>Create</button>
                <button type="button" onClick={() => setShowCreateProject(false)} style={styles.cancelBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {showAssignModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Assign Employee to Project</h3>
            <div style={styles.employeeList}>
              {employees.map(employee => (
                <div key={employee.id} style={styles.employeeListItem}>
                  <div>
                    <strong>{employee.name}</strong>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{employee.email}</p>
                  </div>
                  <button 
                    onClick={() => handleAssignEmployee(showAssignModal, employee.id)}
                    style={styles.assignBtn}
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAssignModal(null)} style={styles.cancelBtn}>Close</button>
          </div>
        </div>
      )}
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
    alignItems: 'center'
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
  logoutBtn: {
    backgroundColor: '#ef4444',
    border: 'none',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
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
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0
  },
  addButton: {
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  table: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'flex',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    padding: '12px'
  },
  tableRow: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    padding: '12px'
  },
  tableCell: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px'
  },
  assignBtn: {
    backgroundColor: '#22c55e',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  employeeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px'
  },
  employeeCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px'
  },
  employeeName: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '4px',
    margin: 0
  },
  employeeEmail: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px',
    margin: 0
  },
  skillTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px'
  },
  skillTag: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    padding: '20px'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '400px',
    maxHeight: '80vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    margin: 0
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px'
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#1a73e8',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    border: 'none',
    padding: '10px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%'
  },
  employeeList: {
    marginBottom: '16px'
  },
  employeeListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb'
  }
};

export default ManagerDashboard;