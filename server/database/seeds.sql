-- Seed data for Skill Training Platform

-- Insert sample users (password: 'password123' for all)
-- Manager
INSERT INTO users (name, email, password_hash, role) VALUES
('Rahul Manager', 'manager@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),
('Amit Kumar', 'amit@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee'),
('Neha Sharma', 'neha@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee'),
('Arjun Patel', 'arjun@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'employee')
ON CONFLICT (email) DO NOTHING;

-- Insert skills
INSERT INTO skills (name, description, category) VALUES
('JavaScript', 'Programming language for web development', 'Frontend'),
('React', 'JavaScript library for building user interfaces', 'Frontend'),
('Node.js', 'JavaScript runtime for server-side development', 'Backend'),
('Python', 'General-purpose programming language', 'Backend'),
('SQL', 'Structured Query Language for databases', 'Database'),
('Flutter', 'UI toolkit for building natively compiled applications', 'Mobile'),
('Firebase', 'Google''s mobile platform that helps you quickly develop apps', 'Mobile'),
('Kotlin', 'Modern programming language for Android development', 'Mobile'),
('Docker', 'Platform for developing, shipping, and running applications', 'DevOps'),
('AWS', 'Amazon Web Services cloud computing platform', 'Cloud'),
('Git', 'Distributed version control system', 'DevOps'),
('TypeScript', 'Typed superset of JavaScript', 'Frontend')
ON CONFLICT (name) DO NOTHING;

-- Insert trainings for each skill
INSERT INTO trainings (skill_id, name, description, duration_hours, difficulty_level) VALUES
-- JavaScript trainings
((SELECT id FROM skills WHERE name = 'JavaScript'), 'JavaScript Basics', 'Learn variables, functions, and control flow in JavaScript', 15, 'beginner'),
((SELECT id FROM skills WHERE name = 'JavaScript'), 'ES6+ Features', 'Master modern JavaScript features like arrow functions, destructuring, and async/await', 20, 'intermediate'),
((SELECT id FROM skills WHERE name = 'JavaScript'), 'Advanced JavaScript Patterns', 'Learn design patterns and advanced concepts', 25, 'advanced'),

-- React trainings
((SELECT id FROM skills WHERE name = 'React'), 'React Fundamentals', 'Components, props, state, and lifecycle methods', 18, 'beginner'),
((SELECT id FROM skills WHERE name = 'React'), 'React Hooks', 'Master useState, useEffect, and custom hooks', 15, 'intermediate'),
((SELECT id FROM skills WHERE name = 'React'), 'State Management', 'Redux, Context API, and state management patterns', 22, 'advanced'),

-- Node.js trainings
((SELECT id FROM skills WHERE name = 'Node.js'), 'Node.js Basics', 'Server-side JavaScript fundamentals', 16, 'beginner'),
((SELECT id FROM skills WHERE name = 'Node.js'), 'Express.js', 'Building REST APIs with Express framework', 20, 'intermediate'),
((SELECT id FROM skills WHERE name = 'Node.js'), 'Authentication & Security', 'JWT, OAuth, and secure API development', 18, 'advanced'),

-- Python trainings
((SELECT id FROM skills WHERE name = 'Python'), 'Python Fundamentals', 'Variables, data types, and control structures', 15, 'beginner'),
((SELECT id FROM skills WHERE name = 'Python'), 'OOP in Python', 'Object-oriented programming concepts', 18, 'intermediate'),
((SELECT id FROM skills WHERE name = 'Python'), 'Python for Data Science', 'NumPy, Pandas, and data analysis', 25, 'advanced'),

-- SQL trainings
((SELECT id FROM skills WHERE name = 'SQL'), 'SQL Basics', 'SELECT, INSERT, UPDATE, DELETE operations', 12, 'beginner'),
((SELECT id FROM skills WHERE name = 'SQL'), 'Joins & Subqueries', 'Complex queries and data relationships', 16, 'intermediate'),
((SELECT id FROM skills WHERE name = 'SQL'), 'Database Optimization', 'Indexing, query optimization, and performance', 20, 'advanced'),

-- Flutter trainings
((SELECT id FROM skills WHERE name = 'Flutter'), 'Flutter Widgets', 'Building UI with Flutter widgets', 20, 'beginner'),
((SELECT id FROM skills WHERE name = 'Flutter'), 'State Management', 'Provider, Bloc, and state management', 22, 'intermediate'),
((SELECT id FROM skills WHERE name = 'Flutter'), 'Firebase Integration', 'Connecting Flutter apps to Firebase', 18, 'advanced'),

-- Firebase trainings
((SELECT id FROM skills WHERE name = 'Firebase'), 'Firebase Basics', 'Getting started with Firebase', 14, 'beginner'),
((SELECT id FROM skills WHERE name = 'Firebase'), 'Cloud Firestore', 'NoSQL database with Firestore', 18, 'intermediate'),
((SELECT id FROM skills WHERE name = 'Firebase'), 'Authentication', 'User authentication with Firebase Auth', 15, 'advanced'),

-- Kotlin trainings
((SELECT id FROM skills WHERE name = 'Kotlin'), 'Kotlin Fundamentals', 'Syntax, null safety, and basics', 16, 'beginner'),
((SELECT id FROM skills WHERE name = 'Kotlin'), 'Android Development', 'Building Android apps with Kotlin', 24, 'intermediate'),
((SELECT id FROM skills WHERE name = 'Kotlin'), 'Coroutines', 'Asynchronous programming in Kotlin', 20, 'advanced');

-- Assign skills to employees
-- Amit has JavaScript and React
INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES
((SELECT id FROM users WHERE email = 'amit@company.com'), (SELECT id FROM skills WHERE name = 'JavaScript'), 'intermediate'),
((SELECT id FROM users WHERE email = 'amit@company.com'), (SELECT id FROM skills WHERE name = 'React'), 'beginner'),
((SELECT id FROM users WHERE email = 'amit@company.com'), (SELECT id FROM skills WHERE name = 'Node.js'), 'beginner')
ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level;

-- Neha has Python and SQL
INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES
((SELECT id FROM users WHERE email = 'neha@company.com'), (SELECT id FROM skills WHERE name = 'Python'), 'intermediate'),
((SELECT id FROM users WHERE email = 'neha@company.com'), (SELECT id FROM skills WHERE name = 'SQL'), 'advanced')
ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level;

-- Arjun has Flutter
INSERT INTO user_skills (user_id, skill_id, proficiency_level) VALUES
((SELECT id FROM users WHERE email = 'arjun@company.com'), (SELECT id FROM skills WHERE name = 'Flutter'), 'beginner'),
((SELECT id FROM users WHERE email = 'arjun@company.com'), (SELECT id FROM skills WHERE name = 'Firebase'), 'beginner')
ON CONFLICT (user_id, skill_id) DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level;

-- Create a sample project by the manager
INSERT INTO projects (name, description, status, created_by) VALUES
('Mobile Banking App', 'A secure mobile banking application with transaction features', 'active', (SELECT id FROM users WHERE email = 'manager@company.com')),
('E-commerce Platform', 'Full-stack e-commerce solution with payment integration', 'pending', (SELECT id FROM users WHERE email = 'manager@company.com')),
('AI Dashboard', 'Analytics dashboard with machine learning insights', 'active', (SELECT id FROM users WHERE email = 'manager@company.com'))
ON CONFLICT DO NOTHING;

-- Add required skills to projects
-- Mobile Banking App needs Flutter, Firebase, Kotlin
INSERT INTO project_skills (project_id, skill_id) VALUES
((SELECT id FROM projects WHERE name = 'Mobile Banking App'), (SELECT id FROM skills WHERE name = 'Flutter')),
((SELECT id FROM projects WHERE name = 'Mobile Banking App'), (SELECT id FROM skills WHERE name = 'Firebase')),
((SELECT id FROM projects WHERE name = 'Mobile Banking App'), (SELECT id FROM skills WHERE name = 'Kotlin'))
ON CONFLICT DO NOTHING;

-- E-commerce needs React, Node.js, SQL
INSERT INTO project_skills (project_id, skill_id) VALUES
((SELECT id FROM projects WHERE name = 'E-commerce Platform'), (SELECT id FROM skills WHERE name = 'React')),
((SELECT id FROM projects WHERE name = 'E-commerce Platform'), (SELECT id FROM skills WHERE name = 'Node.js')),
((SELECT id FROM projects WHERE name = 'E-commerce Platform'), (SELECT id FROM skills WHERE name = 'SQL'))
ON CONFLICT DO NOTHING;

-- AI Dashboard needs Python, SQL, React
INSERT INTO project_skills (project_id, skill_id) VALUES
((SELECT id FROM projects WHERE name = 'AI Dashboard'), (SELECT id FROM skills WHERE name = 'Python')),
((SELECT id FROM projects WHERE name = 'AI Dashboard'), (SELECT id FROM skills WHERE name = 'SQL')),
((SELECT id FROM projects WHERE name = 'AI Dashboard'), (SELECT id FROM skills WHERE name = 'React'))
ON CONFLICT DO NOTHING;

-- Assign employees to projects
-- Amit to E-commerce (he has some skills but missing SQL advanced)
INSERT INTO project_assignments (project_id, employee_id, assigned_by) VALUES
((SELECT id FROM projects WHERE name = 'E-commerce Platform'), (SELECT id FROM users WHERE email = 'amit@company.com'), (SELECT id FROM users WHERE email = 'manager@company.com')),
((SELECT id FROM projects WHERE name = 'AI Dashboard'), (SELECT id FROM users WHERE email = 'amit@company.com'), (SELECT id FROM users WHERE email = 'manager@company.com'))
ON CONFLICT DO NOTHING;

-- Neha to AI Dashboard (she has Python and SQL, missing React)
INSERT INTO project_assignments (project_id, employee_id, assigned_by) VALUES
((SELECT id FROM projects WHERE name = 'AI Dashboard'), (SELECT id FROM users WHERE email = 'neha@company.com'), (SELECT id FROM users WHERE email = 'manager@company.com'))
ON CONFLICT DO NOTHING;

-- Arjun to Mobile Banking (he has Flutter and Firebase, missing Kotlin)
INSERT INTO project_assignments (project_id, employee_id, assigned_by) VALUES
((SELECT id FROM projects WHERE name = 'Mobile Banking App'), (SELECT id FROM users WHERE email = 'arjun@company.com'), (SELECT id FROM users WHERE email = 'manager@company.com'))
ON CONFLICT DO NOTHING;

-- Create skill gaps for missing skills
-- Amit missing SQL for E-commerce
INSERT INTO skill_gaps (employee_id, project_id, skill_id, status) VALUES
((SELECT id FROM users WHERE email = 'amit@company.com'), (SELECT id FROM projects WHERE name = 'E-commerce Platform'), (SELECT id FROM skills WHERE name = 'SQL'), 'pending'),
((SELECT id FROM users WHERE email = 'amit@company.com'), (SELECT id FROM projects WHERE name = 'AI Dashboard'), (SELECT id FROM skills WHERE name = 'Python'), 'pending')
ON CONFLICT DO NOTHING;

-- Neha missing React for AI Dashboard
INSERT INTO skill_gaps (employee_id, project_id, skill_id, status) VALUES
((SELECT id FROM users WHERE email = 'neha@company.com'), (SELECT id FROM projects WHERE name = 'AI Dashboard'), (SELECT id FROM skills WHERE name = 'React'), 'pending')
ON CONFLICT DO NOTHING;

-- Arjun missing Kotlin for Mobile Banking
INSERT INTO skill_gaps (employee_id, project_id, skill_id, status) VALUES
((SELECT id FROM users WHERE email = 'arjun@company.com'), (SELECT id FROM projects WHERE name = 'Mobile Banking App'), (SELECT id FROM skills WHERE name = 'Kotlin'), 'pending')
ON CONFLICT DO NOTHING;

-- Assign training modules for skill gaps
-- Amit gets SQL training assigned
INSERT INTO training_progress (employee_id, training_id, project_id, status) VALUES
((SELECT id FROM users WHERE email = 'amit@company.com'), 
 (SELECT id FROM trainings WHERE name = 'SQL Basics' LIMIT 1), 
 (SELECT id FROM projects WHERE name = 'E-commerce Platform'), 
 'assigned'),
((SELECT id FROM users WHERE email = 'amit@company.com'), 
 (SELECT id FROM trainings WHERE name = 'Python Fundamentals' LIMIT 1), 
 (SELECT id FROM projects WHERE name = 'AI Dashboard'), 
 'assigned')
ON CONFLICT DO NOTHING;

-- Neha gets React training assigned
INSERT INTO training_progress (employee_id, training_id, project_id, status) VALUES
((SELECT id FROM users WHERE email = 'neha@company.com'), 
 (SELECT id FROM trainings WHERE name = 'React Fundamentals' LIMIT 1), 
 (SELECT id FROM projects WHERE name = 'AI Dashboard'), 
 'assigned')
ON CONFLICT DO NOTHING;

-- Arjun gets Kotlin training assigned
INSERT INTO training_progress (employee_id, training_id, project_id, status) VALUES
((SELECT id FROM users WHERE email = 'arjun@company.com'), 
 (SELECT id FROM trainings WHERE name = 'Kotlin Fundamentals' LIMIT 1), 
 (SELECT id FROM projects WHERE name = 'Mobile Banking App'), 
 'assigned')
ON CONFLICT DO NOTHING;

-- Add sample notifications
INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type, read) VALUES
((SELECT id FROM users WHERE email = 'amit@company.com'), 'project_assignment', 'New Project Assignment', 'You have been assigned to E-commerce Platform', 2, 'project', false),
((SELECT id FROM users WHERE email = 'amit@company.com'), 'skill_gap', 'New Skill Required', 'You need to learn SQL for E-commerce Platform', 5, 'skill', false),
((SELECT id FROM users WHERE email = 'neha@company.com'), 'project_assignment', 'New Project Assignment', 'You have been assigned to AI Dashboard', 3, 'project', false),
((SELECT id FROM users WHERE email = 'arjun@company.com'), 'project_assignment', 'New Project Assignment', 'You have been assigned to Mobile Banking App', 1, 'project', false)
ON CONFLICT DO NOTHING;