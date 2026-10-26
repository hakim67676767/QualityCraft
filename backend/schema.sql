CREATE TABLE IF NOT EXISTS `role` (
    role_id INT NOT NULL,
    role_name VARCHAR(50) NOT NULL,
    PRIMARY KEY (role_id),
    UNIQUE KEY roles_name_unique (role_name)
);

INSERT IGNORE INTO `role` (role_id, role_name) VALUES
    (1, 'student'),
    (2, 'teacher'),
    (3, 'administrator');

CREATE TABLE IF NOT EXISTS `user` (
    user_id INT NOT NULL AUTO_INCREMENT,
    role_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    xp_points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY user_email_unique (email),
    KEY user_role_id_index (role_id),
    CONSTRAINT user_role_id_fk FOREIGN KEY (role_id) REFERENCES `role` (role_id)
);

CREATE TABLE IF NOT EXISTS `badge` (
    badge_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    criteria TEXT NOT NULL,
    PRIMARY KEY (badge_id),
    UNIQUE KEY badges_name_unique (name)
);

CREATE TABLE IF NOT EXISTS `user_badge` (
    user_badge_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    awarded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_badge_id),
    UNIQUE KEY user_badge_user_badge_unique (user_id, badge_id),
    KEY user_badge_badge_id_index (badge_id),
    CONSTRAINT user_badge_user_fk FOREIGN KEY (user_id) REFERENCES `user` (user_id),
    CONSTRAINT user_badge_badge_fk FOREIGN KEY (badge_id) REFERENCES `badge` (badge_id)
);

CREATE TABLE IF NOT EXISTS `class` (
    class_id INT NOT NULL AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    class_name VARCHAR(150) NOT NULL,
    PRIMARY KEY (class_id),
    KEY class_teacher_id_index (teacher_id),
    CONSTRAINT class_teacher_fk FOREIGN KEY (teacher_id) REFERENCES `user` (user_id)
);

CREATE TABLE IF NOT EXISTS `class_member` (
    class_member_id INT NOT NULL AUTO_INCREMENT,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    PRIMARY KEY (class_member_id),
    UNIQUE KEY class_member_class_student_unique (class_id, student_id),
    KEY class_member_student_id_index (student_id),
    CONSTRAINT class_member_class_fk FOREIGN KEY (class_id) REFERENCES `class` (class_id),
    CONSTRAINT class_member_student_fk FOREIGN KEY (student_id) REFERENCES `user` (user_id)
);

CREATE TABLE IF NOT EXISTS `module` (
    module_id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    PRIMARY KEY (module_id)
);

CREATE TABLE IF NOT EXISTS `lesson` (
    lesson_id INT NOT NULL AUTO_INCREMENT,
    module_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    sequence_no INT NOT NULL,
    PRIMARY KEY (lesson_id),
    UNIQUE KEY lesson_module_sequence_unique (module_id, sequence_no),
    CONSTRAINT lesson_module_fk FOREIGN KEY (module_id) REFERENCES `module` (module_id)
);

CREATE TABLE IF NOT EXISTS `lesson_completion` (
    completion_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (completion_id),
    UNIQUE KEY lesson_completion_user_lesson_unique (user_id, lesson_id),
    KEY lesson_completion_lesson_index (lesson_id),
    CONSTRAINT lesson_completion_user_fk FOREIGN KEY (user_id) REFERENCES `user` (user_id) ON DELETE CASCADE,
    CONSTRAINT lesson_completion_lesson_fk FOREIGN KEY (lesson_id) REFERENCES `lesson` (lesson_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `question` (
    question_id INT NOT NULL AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    options TEXT,
    question_text TEXT NOT NULL,
    answer_key TEXT NOT NULL,
    explanation TEXT NULL,
    PRIMARY KEY (question_id),
    CONSTRAINT question_lesson_fk FOREIGN KEY (lesson_id) REFERENCES `lesson` (lesson_id)
);

CREATE TABLE IF NOT EXISTS `activity` (
    activity_id INT NOT NULL AUTO_INCREMENT,
    lesson_id INT NOT NULL,
    activity_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    instructions TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (activity_id),
    CONSTRAINT activity_lesson_fk FOREIGN KEY (lesson_id) REFERENCES `lesson` (lesson_id)
);

CREATE TABLE IF NOT EXISTS `activity_submission` (
    submission_id INT NOT NULL AUTO_INCREMENT,
    activity_id INT NOT NULL,
    user_id INT NOT NULL,
    content JSON NOT NULL,
    xp_awarded BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (submission_id),
    UNIQUE KEY activity_submission_user_activity_unique (activity_id, user_id),
    CONSTRAINT activity_submission_activity_fk FOREIGN KEY (activity_id) REFERENCES `activity` (activity_id),
    CONSTRAINT activity_submission_user_fk FOREIGN KEY (user_id) REFERENCES `user` (user_id)
);

CREATE TABLE IF NOT EXISTS progress (
    progress_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'not_started',
    percent_complete DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (progress_id),
    UNIQUE KEY progress_user_module_unique (user_id, module_id),
    KEY progress_module_id_index (module_id),
    CONSTRAINT progress_user_fk FOREIGN KEY (user_id) REFERENCES `user` (user_id),
    CONSTRAINT progress_module_fk FOREIGN KEY (module_id) REFERENCES `module` (module_id),
    CONSTRAINT progress_percent_check CHECK (percent_complete BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS `quiz_attempt` (
    attempt_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    lesson_id INT NOT NULL,
    score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    completed_at TIMESTAMP NULL,
    PRIMARY KEY (attempt_id),
    KEY quiz_attempt_user_id_index (user_id),
    KEY quiz_attempt_lesson_id_index (lesson_id),
    CONSTRAINT quiz_attempt_user_fk FOREIGN KEY (user_id) REFERENCES `user` (user_id),
    CONSTRAINT quiz_attempt_lesson_fk FOREIGN KEY (lesson_id) REFERENCES `lesson` (lesson_id),
    CONSTRAINT quiz_attempts_score_check CHECK (score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS `survey_response` (
    response_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    phase VARCHAR(20) NOT NULL,
    score DECIMAL(5, 2) NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (response_id),
    KEY survey_response_user_id_index (user_id),
    CONSTRAINT survey_response_user_fk FOREIGN KEY (user_id) REFERENCES `user` (user_id),
    CONSTRAINT survey_response_phase_check CHECK (phase IN ('pre', 'post')),
    CONSTRAINT survey_response_score_check CHECK (score BETWEEN 0 AND 100)
);
