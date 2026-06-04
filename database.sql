-- ============================================================
-- DATABASE: Garuda Nexa Bahtera
-- Setup: Import file ini di phpMyAdmin atau jalankan via MySQL CLI
-- ============================================================

CREATE DATABASE IF NOT EXISTS db_garudanexabahtera;
USE db_garudanexabahtera;

-- Users table for admin and client access
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive') DEFAULT 'active',
    avatar LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hero settings (Hero section, logo, etc.)
CREATE TABLE IF NOT EXISTS hero_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Services / Features
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2),
    image_url VARCHAR(255),
    category VARCHAR(100),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects for Client Services (Website, Apps, etc.)
CREATE TABLE IF NOT EXISTS project_client (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    service_type ENUM('website', 'mobile_app', 'ui_ux', 'other') DEFAULT 'website',
    status ENUM('active', 'pending', 'completed', 'canceled') DEFAULT 'active',
    assigned_user VARCHAR(255),
    price DECIMAL(15, 2),
    start_date DATE,
    end_date DATE,
    image LONGTEXT,
    project_files LONGTEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Visitor stats (tracking jumlah pengunjung website)
CREATE TABLE IF NOT EXISTS visitor_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_visits INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- DATA AWAL (Initial Seed)
-- ============================================================

-- Admin default (password: admin123)
INSERT INTO users (name, email, password, role, status) 
VALUES ('Administrator', 'admin@garudanexa.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active')
ON DUPLICATE KEY UPDATE email=email;

-- Settings awal
INSERT INTO hero_settings (setting_key, setting_value) VALUES 
('hero_title', 'Elevate Your Business with Garuda Nexa'),
('hero_subtitle', 'Leading edge technology solutions for the modern world.'),
('contact_email', 'info@garudanexa.com'),
('contact_whatsapp', '628123456789'),
('site_logo', '/assets/logo/logogarudanexa.png'),
('hero_logos', '[]')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- Baris awal visitor stats (wajib ada id=1)
INSERT INTO visitor_stats (id, total_visits) VALUES (1, 0)
ON DUPLICATE KEY UPDATE id=id;

