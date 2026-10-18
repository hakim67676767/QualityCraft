// Declarative description of every table, column, index and foreign key that the
// QualityCraft product schema requires. The migration runner reads this file and
// applies only the pieces that are missing, so it is safe to run repeatedly.

const tables = [
    {
        name: "research_participant",
        sql: `CREATE TABLE IF NOT EXISTS \`research_participant\` (
            participant_id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            study_code VARCHAR(32) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            school_permission BOOLEAN NOT NULL DEFAULT FALSE,
            guardian_consent BOOLEAN NOT NULL DEFAULT FALSE,
            student_assent BOOLEAN NOT NULL DEFAULT FALSE,
            approved_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (participant_id),
            UNIQUE KEY research_participant_user_unique (user_id),
            UNIQUE KEY research_participant_code_unique (study_code),
            KEY research_participant_status_index (status),
            CONSTRAINT research_participant_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (user_id) ON DELETE CASCADE,
            CONSTRAINT research_participant_status_check CHECK (status IN ('pending', 'authorised', 'withdrawn'))
        )`,
    },
    {
        name: "assessment_instrument",
        sql: `CREATE TABLE IF NOT EXISTS \`assessment_instrument\` (
            instrument_id INT NOT NULL AUTO_INCREMENT,
            phase VARCHAR(20) NOT NULL,
            title VARCHAR(160) NOT NULL,
            version VARCHAR(30) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            created_by INT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (instrument_id),
            UNIQUE KEY assessment_instrument_version_unique (phase, version),
            KEY assessment_instrument_status_index (phase, status),
            CONSTRAINT assessment_instrument_creator_fk FOREIGN KEY (created_by) REFERENCES \`user\` (user_id) ON DELETE SET NULL,
            CONSTRAINT assessment_instrument_phase_check CHECK (phase IN ('pre', 'post')),
            CONSTRAINT assessment_instrument_status_check CHECK (status IN ('draft', 'published', 'retired'))
        )`,
    },
    {
        name: "assessment_item",
        sql: `CREATE TABLE IF NOT EXISTS \`assessment_item\` (
            item_id INT NOT NULL AUTO_INCREMENT,
            instrument_id INT NOT NULL,
            construct_key VARCHAR(80) NULL,
            type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice',
            prompt TEXT NOT NULL,
            options JSON NULL,
            answer_key TEXT NOT NULL,
            sequence_no INT NOT NULL DEFAULT 0,
            is_required BOOLEAN NOT NULL DEFAULT TRUE,
            PRIMARY KEY (item_id),
            KEY assessment_item_instrument_index (instrument_id, sequence_no),
            CONSTRAINT assessment_item_instrument_fk FOREIGN KEY (instrument_id) REFERENCES \`assessment_instrument\` (instrument_id) ON DELETE CASCADE
        )`,
    },
    {
        name: "class_assignment",
        sql: `CREATE TABLE IF NOT EXISTS \`class_assignment\` (
            assignment_id INT NOT NULL AUTO_INCREMENT,
            class_id INT NOT NULL,
            activity_id INT NOT NULL,
            assigned_by INT NOT NULL,
            due_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (assignment_id),
            UNIQUE KEY class_assignment_unique (class_id, activity_id),
            KEY class_assignment_activity_index (activity_id),
            CONSTRAINT class_assignment_class_fk FOREIGN KEY (class_id) REFERENCES \`class\` (class_id) ON DELETE CASCADE,
            CONSTRAINT class_assignment_activity_fk FOREIGN KEY (activity_id) REFERENCES \`activity\` (activity_id) ON DELETE CASCADE,
            CONSTRAINT class_assignment_actor_fk FOREIGN KEY (assigned_by) REFERENCES \`user\` (user_id) ON DELETE CASCADE
        )`,
    },
    {
        name: "system_setting",
        sql: `CREATE TABLE IF NOT EXISTS \`system_setting\` (
            setting_key VARCHAR(80) NOT NULL,
            setting_value JSON NOT NULL,
            updated_by INT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (setting_key),
            CONSTRAINT system_setting_actor_fk FOREIGN KEY (updated_by) REFERENCES \`user\` (user_id) ON DELETE SET NULL
        )`,
    },
    {
        name: "lesson_completion",
        sql: `CREATE TABLE IF NOT EXISTS \`lesson_completion\` (
            completion_id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            lesson_id INT NOT NULL,
            completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (completion_id),
            UNIQUE KEY lesson_completion_user_lesson_unique (user_id, lesson_id),
            KEY lesson_completion_lesson_index (lesson_id),
            CONSTRAINT lesson_completion_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (user_id) ON DELETE CASCADE,
            CONSTRAINT lesson_completion_lesson_fk FOREIGN KEY (lesson_id) REFERENCES \`lesson\` (lesson_id) ON DELETE CASCADE
        )`,
    },
    {
        name: "audit_log",
        sql: `CREATE TABLE IF NOT EXISTS \`audit_log\` (
            log_id BIGINT NOT NULL AUTO_INCREMENT,
            actor_id INT NULL,
            actor_role VARCHAR(50) NULL,
            action VARCHAR(60) NOT NULL,
            entity_type VARCHAR(60) NOT NULL,
            entity_id INT NULL,
            summary VARCHAR(255) NOT NULL,
            details JSON NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (log_id),
            KEY audit_log_actor_index (actor_id),
            KEY audit_log_entity_index (entity_type, entity_id),
            KEY audit_log_created_index (created_at),
            CONSTRAINT audit_log_actor_fk FOREIGN KEY (actor_id) REFERENCES \`user\` (user_id) ON DELETE SET NULL
        )`,
    },
    {
        name: "gamification_rule",
        sql: `CREATE TABLE IF NOT EXISTS \`gamification_rule\` (
            rule_id INT NOT NULL AUTO_INCREMENT,
            code VARCHAR(60) NOT NULL,
            name VARCHAR(120) NOT NULL,
            event_type VARCHAR(60) NOT NULL,
            xp_amount INT NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            description VARCHAR(255) NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (rule_id),
            UNIQUE KEY gamification_rule_code_unique (code)
        )`,
    },
    {
        name: "quiz_attempt_answer",
        sql: `CREATE TABLE IF NOT EXISTS \`quiz_attempt_answer\` (
            answer_id INT NOT NULL AUTO_INCREMENT,
            attempt_id INT NOT NULL,
            question_id INT NOT NULL,
            submitted_answer TEXT NULL,
            correct_answer TEXT NULL,
            is_correct BOOLEAN NOT NULL DEFAULT FALSE,
            feedback TEXT NULL,
            PRIMARY KEY (answer_id),
            KEY quiz_attempt_answer_attempt_index (attempt_id),
            KEY quiz_attempt_answer_question_index (question_id),
            CONSTRAINT quiz_attempt_answer_attempt_fk FOREIGN KEY (attempt_id) REFERENCES \`quiz_attempt\` (attempt_id) ON DELETE CASCADE,
            CONSTRAINT quiz_attempt_answer_question_fk FOREIGN KEY (question_id) REFERENCES \`question\` (question_id) ON DELETE CASCADE
        )`,
    },
    {
        name: "assessment_attempt",
        sql: `CREATE TABLE IF NOT EXISTS \`assessment_attempt\` (
            assessment_attempt_id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            phase VARCHAR(20) NOT NULL,
            score DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
            correct_count INT NOT NULL DEFAULT 0,
            total_questions INT NOT NULL DEFAULT 0,
            submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (assessment_attempt_id),
            KEY assessment_attempt_user_index (user_id),
            KEY assessment_attempt_phase_index (phase),
            CONSTRAINT assessment_attempt_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (user_id) ON DELETE CASCADE,
            CONSTRAINT assessment_attempt_phase_check CHECK (phase IN ('pre', 'post')),
            CONSTRAINT assessment_attempt_score_check CHECK (score BETWEEN 0 AND 100)
        )`,
    },
    {
        name: "xp_event",
        sql: `CREATE TABLE IF NOT EXISTS \`xp_event\` (
            event_id BIGINT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            event_key VARCHAR(120) NOT NULL,
            event_type VARCHAR(60) NOT NULL,
            amount INT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (event_id),
            UNIQUE KEY xp_event_once (user_id, event_key),
            CONSTRAINT xp_event_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (user_id) ON DELETE CASCADE
        )`,
    },
    {
        name: "suitability_response",
        sql: `CREATE TABLE IF NOT EXISTS \`suitability_response\` (
            response_id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            answers JSON NOT NULL,
            comment TEXT NULL,
            submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (response_id),
            UNIQUE KEY suitability_once (user_id),
            CONSTRAINT suitability_user_fk FOREIGN KEY (user_id) REFERENCES \`user\` (user_id) ON DELETE CASCADE
        )`,
    },
]

const columns = [
    { table: "survey_response", column: "rating_mean", definition: "DECIMAL(3, 2) NULL" },
    { table: "survey_response", column: "ratings", definition: "JSON NULL" },
    { table: "assessment_attempt", column: "rating_mean", definition: "DECIMAL(3, 2) NULL" },
    { table: "assessment_attempt", column: "ratings", definition: "JSON NULL" },
    { table: "assessment_attempt", column: "is_retake", definition: "BOOLEAN NOT NULL DEFAULT FALSE" },
    { table: "module", column: "sequence_no", definition: "INT NOT NULL DEFAULT 0", after: "description" },
    { table: "module", column: "published_at", definition: "TIMESTAMP NULL DEFAULT NULL", after: "status" },
    { table: "module", column: "updated_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", after: "published_at" },

    { table: "lesson", column: "updated_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", after: "sequence_no" },

    { table: "question", column: "explanation", definition: "TEXT NULL", after: "answer_key" },
    { table: "question", column: "points", definition: "INT NOT NULL DEFAULT 1", after: "explanation" },
    { table: "question", column: "updated_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", after: "points" },

    { table: "activity", column: "is_required", definition: "BOOLEAN NOT NULL DEFAULT TRUE", after: "instructions" },
    { table: "activity", column: "updated_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", after: "is_required" },

    { table: "activity_submission", column: "status", definition: "VARCHAR(20) NOT NULL DEFAULT 'submitted'", after: "content" },
    { table: "activity_submission", column: "feedback", definition: "TEXT NULL", after: "status" },
    { table: "activity_submission", column: "reviewed_by", definition: "INT NULL", after: "feedback" },
    { table: "activity_submission", column: "reviewed_at", definition: "TIMESTAMP NULL DEFAULT NULL", after: "reviewed_by" },

    { table: "quiz_attempt", column: "correct_count", definition: "INT NOT NULL DEFAULT 0", after: "score" },
    { table: "quiz_attempt", column: "total_questions", definition: "INT NOT NULL DEFAULT 0", after: "correct_count" },

    { table: "badge", column: "code", definition: "VARCHAR(60) NULL", after: "name" },
    { table: "badge", column: "description", definition: "VARCHAR(255) NULL", after: "criteria" },
    { table: "badge", column: "icon", definition: "VARCHAR(40) NULL", after: "description" },
    { table: "badge", column: "criteria_type", definition: "VARCHAR(60) NULL", after: "icon" },
    { table: "badge", column: "criteria_threshold", definition: "INT NOT NULL DEFAULT 0", after: "criteria_type" },
    { table: "badge", column: "is_active", definition: "BOOLEAN NOT NULL DEFAULT TRUE", after: "criteria_threshold" },
    { table: "badge", column: "sort_order", definition: "INT NOT NULL DEFAULT 0", after: "is_active" },
    { table: "badge", column: "updated_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", after: "sort_order" },

    { table: "progress", column: "created_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP", after: "percent_complete" },
    { table: "progress", column: "completed_at", definition: "TIMESTAMP NULL DEFAULT NULL", after: "created_at" },
    { table: "progress", column: "updated_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", after: "completed_at" },

    { table: "class", column: "created_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP", after: "class_name" },
    { table: "class", column: "updated_at", definition: "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP", after: "created_at" },

    { table: "user", column: "last_login_at", definition: "TIMESTAMP NULL DEFAULT NULL", after: "xp_points" },
    { table: "assessment_attempt", column: "instrument_id", definition: "INT NULL", after: "user_id" },
]

const indexes = [
    { table: "badge", name: "badge_code_unique", definition: "UNIQUE KEY `badge_code_unique` (`code`)" },
    { table: "activity_submission", name: "activity_submission_status_index", definition: "KEY `activity_submission_status_index` (`status`)" },
    { table: "quiz_attempt", name: "quiz_attempt_completed_index", definition: "KEY `quiz_attempt_completed_index` (`completed_at`)" },
    { table: "audit_log", name: "audit_log_action_index", definition: "KEY `audit_log_action_index` (`action`)" },
]

const foreignKeys = [
    {
        table: "assessment_attempt",
        name: "assessment_attempt_instrument_fk",
        definition: "CONSTRAINT `assessment_attempt_instrument_fk` FOREIGN KEY (`instrument_id`) REFERENCES `assessment_instrument` (`instrument_id`) ON DELETE SET NULL",
    },
    {
        table: "activity_submission",
        name: "activity_submission_reviewer_fk",
        definition: "CONSTRAINT `activity_submission_reviewer_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `user` (`user_id`) ON DELETE SET NULL",
    },
]

module.exports = { tables, columns, indexes, foreignKeys }
