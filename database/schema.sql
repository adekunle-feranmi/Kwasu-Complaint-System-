-- ============================================================
-- KWASU Automated Complaint Management System
-- MySQL Schema
-- Categories: Academic, Administrative (2 categories only)
-- ============================================================

CREATE DATABASE IF NOT EXISTS kwasu_complaints
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kwasu_complaints;

-- ----------------------------------------------------------------
-- users: credentials and role. Login via email OR matric number.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  matric_number VARCHAR(50)  UNIQUE,                 -- NULL for admins
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student','admin') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_matric (matric_number)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- profiles: student profile + verification state
-- verification_status: pending -> verified / rejected / banned
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL UNIQUE,
  full_name           VARCHAR(255) NOT NULL,
  matric_number       VARCHAR(50),
  department          VARCHAR(255),
  level               VARCHAR(20),
  verification_status ENUM('pending','verified','rejected','banned')
                        NOT NULL DEFAULT 'pending',
  reject_reason       TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_profiles_status (verification_status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- categories: the two complaint categories
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

INSERT INTO categories (name) VALUES ('Academic'), ('Administrative')
  ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ----------------------------------------------------------------
-- complaints: submitted complaints
-- status: pending -> in_progress -> resolved
-- is_flagged: TRUE means it went to the flagged queue (abuse)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  user_id            INT NOT NULL,
  complaint_text     TEXT NOT NULL,
  predicted_category VARCHAR(50),                    -- NULL while flagged
  category_id        INT,
  status             ENUM('pending','in_progress','resolved')
                       NOT NULL DEFAULT 'pending',
  is_flagged         BOOLEAN NOT NULL DEFAULT FALSE,
  is_published       BOOLEAN NOT NULL DEFAULT TRUE,  -- flagged => FALSE until cleared
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_complaints_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_complaints_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_complaints_status (status),
  INDEX idx_complaints_flagged (is_flagged),
  INDEX idx_complaints_created (created_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- resolutions: admin response text attached to a complaint
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resolutions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  admin_id     INT NOT NULL,
  response_text TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resolutions_complaint FOREIGN KEY (complaint_id)
    REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_resolutions_admin FOREIGN KEY (admin_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- comments: verified students commenting on feed complaints
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  user_id      INT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_complaint FOREIGN KEY (complaint_id)
    REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- abuse_flags: record of why a complaint was flagged + review state
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abuse_flags (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id  INT NOT NULL,
  flag_reason   TEXT,                                -- matched word/pattern
  review_status ENUM('pending','cleared','confirmed')
                  NOT NULL DEFAULT 'pending',
  reviewed_by   INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_flags_complaint FOREIGN KEY (complaint_id)
    REFERENCES complaints(id) ON DELETE CASCADE,
  CONSTRAINT fk_flags_admin FOREIGN KEY (reviewed_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- notifications: messages to students (rejection reason, etc.)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL,
  message   TEXT NOT NULL,
  is_read   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------
-- activity_logs: audit trail of admin/student actions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  action     VARCHAR(255) NOT NULL,
  detail     TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_logs_created (created_at)
) ENGINE=InnoDB;
