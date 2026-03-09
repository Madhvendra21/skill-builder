-- Seed initial data for testing

-- Insert Skills (15 skills)
INSERT INTO skills (name, description, category) VALUES
('JavaScript', 'Programming language for web development', 'Programming'),
('Python', 'General purpose programming language', 'Programming'),
('React', 'Frontend JavaScript library', 'Frontend'),
('Node.js', 'Backend JavaScript runtime', 'Backend'),
('SQL', 'Database query language', 'Database'),
('AWS', 'Amazon Web Services cloud platform', 'Cloud'),
('Docker', 'Containerization platform', 'DevOps'),
('Git', 'Version control system', 'Tools'),
('TypeScript', 'Typed JavaScript superset', 'Programming'),
('MongoDB', 'NoSQL database', 'Database'),
('Kubernetes', 'Container orchestration', 'DevOps'),
('GraphQL', 'API query language', 'Backend'),
('Vue.js', 'Frontend JavaScript framework', 'Frontend'),
('Java', 'Object-oriented programming language', 'Programming'),
('PostgreSQL', 'Relational database', 'Database');

-- Insert Users (2 managers, 5 employees)
-- Password for all users: 'password123'
-- Hash generated with bcrypt, cost factor 10
INSERT INTO users (name, email, password_hash, role) VALUES
('Rahul Manager', 'manager@company.com', '$2a$10$8K1p/a8F7T3wP9TvRJzJJuQ5mYHXOV.qC7cFZGqXhDn2M8ZPVKvSO', 'manager'),
('Priya Lead', 'lead@company.com', '$2a$10$8K1p/a8F7T3wP9TvRJzJJuQ5mYHXOV.qC7cFZGqXhDn2M8ZPVKvSO', 'manager'),
('Amit Kumar', 'amit@company.com', '$2a$10$8K1p/a8F7T3wP9TvRJzJJuQ5mYHXOV.qC7cFZGqXhDn2M8ZPVKvSO', 'employee'),
('Sneha Sharma', 'sneha@company.com', '$2a$10$8K1p/a8F7T3wP9TvRJzJJuQ5mYHXOV.qC7cFZGqXhDn2M8ZPVKvSO', 'employee'),
('Vikram Singh', 'vikram@company.com', '$2a$10$8K1p/a8F7T3wP9TvRJzJJuQ5mYHXOV.qC7cFZGqXhDn2M8ZPVKvSO', 'employee'),
('Priya Patel', 'priya.p@company.com', '$2a$10$8K1p/a8F7T3wP9TvRJzJJuQ5mYHXOV.qC7cFZGqXhDn2M8ZPVKvSO', 'employee'),
('Ravi Gupta', 'ravi@company.com', '$2a$10$8K1p/a8F7T3wP9TvRJzJJuQ5mYHXOV.qC7cFZGqXhDn2M8ZPVKvSO', 'employee');

-- Insert User Skills (each employee has some skills)
INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES
-- Amit (user 3) has JavaScript, React, Git
(3, 1, 'intermediate'),
(3, 3, 'intermediate'),
(3, 8, 'advanced'),
-- Sneha (user 4) has Python, SQL, PostgreSQL
(4, 2, 'advanced'),
(4, 5, 'intermediate'),
(4, 15, 'intermediate'),
-- Vikram (user 5) has Node.js, AWS, Docker
(5, 4, 'intermediate'),
(5, 6, 'beginner'),
(5, 7, 'intermediate'),
-- Priya P (user 6) has React, TypeScript, MongoDB
(6, 3, 'advanced'),
(6, 9, 'intermediate'),
(6, 10, 'beginner'),
-- Ravi (user 7) has Java, Kubernetes, SQL
(7, 14, 'advanced'),
(7, 11, 'beginner'),
(7, 5, 'intermediate');

-- Insert Projects (3 projects)
INSERT INTO projects (name, description, status, created_by) VALUES
('E-commerce Platform', 'Build a modern e-commerce platform with React and Node.js', 'active', 1),
('Mobile Banking App', 'Develop a secure mobile banking application', 'active', 1),
('Data Analytics Dashboard', 'Create a real-time analytics dashboard', 'pending', 2);

-- Insert Project Skills (skills required for each project)
INSERT INTO project_skills (project_id, skill_id, required_count) VALUES
-- E-commerce Platform (project 1) needs: JavaScript, React, Node.js, SQL, Git
(1, 1, 1),
(1, 3, 1),
(1, 4, 1),
(1, 5, 1),
(1, 8, 1),
-- Mobile Banking App (project 2) needs: Java, AWS, Docker, SQL, Kubernetes
(2, 14, 1),
(2, 6, 1),
(2, 7, 1),
(2, 5, 1),
(2, 11, 1),
-- Data Analytics Dashboard (project 3) needs: Python, SQL, PostgreSQL, React
(3, 2, 1),
(3, 5, 1),
(3, 15, 1),
(3, 3, 1);

-- Insert Project Assignments
INSERT INTO project_assignments (project_id, employee_id, assigned_by) VALUES
-- Amit assigned to E-commerce Platform
(1, 3, 1),
-- Sneha assigned to Data Analytics Dashboard
(3, 4, 2),
-- Vikram assigned to E-commerce Platform
(1, 5, 1),
-- Priya P assigned to E-commerce Platform
(1, 6, 1);

-- Insert Skill Tasks (for assigned employees, tasks for skills they need to learn)
INSERT INTO skill_tasks (project_id, employee_id, skill_id, status, assigned_by) VALUES
-- Amit needs to learn Node.js and SQL for E-commerce project
(1, 3, 4, 'pending', 1),
(1, 3, 5, 'pending', 1),
-- Vikram needs to learn JavaScript, React, SQL for E-commerce project
(1, 5, 1, 'pending', 1),
(1, 5, 3, 'pending', 1),
(1, 5, 5, 'pending', 1),
-- Priya P needs to learn Node.js and SQL for E-commerce project
(1, 6, 4, 'pending', 1),
(1, 6, 5, 'pending', 1),
-- Sneha needs to learn React for Analytics Dashboard
(3, 4, 3, 'pending', 2);

-- Insert Notifications
INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type) VALUES
-- Amit's notifications
(3, 'skill_task', 'New skill task assigned', 'You have been assigned to work on "Node.js" skill for project "E-commerce Platform". Please complete this task.', 1, 'skill_task'),
(3, 'skill_task', 'New skill task assigned', 'You have been assigned to work on "SQL" skill for project "E-commerce Platform". Please complete this task.', 1, 'skill_task'),
-- Vikram's notifications
(5, 'skill_task', 'New skill task assigned', 'You have been assigned to work on "JavaScript" skill for project "E-commerce Platform". Please complete this task.', 1, 'skill_task'),
(5, 'skill_task', 'New skill task assigned', 'You have been assigned to work on "React" skill for project "E-commerce Platform". Please complete this task.', 1, 'skill_task'),
-- Priya P's notifications
(6, 'skill_task', 'New skill task assigned', 'You have been assigned to work on "Node.js" skill for project "E-commerce Platform". Please complete this task.', 1, 'skill_task'),
-- Sneha's notifications
(4, 'skill_task', 'New skill task assigned', 'You have been assigned to work on "React" skill for project "Data Analytics Dashboard". Please complete this task.', 3, 'skill_task');