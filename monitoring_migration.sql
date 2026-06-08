-- =============================================
-- Monitoring Center Migration
-- =============================================
USE db_garudanexabahtera;

-- Websites to monitor
CREATE TABLE IF NOT EXISTS monitor_websites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  check_interval INT DEFAULT 5, -- minutes
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Website monitoring logs
CREATE TABLE IF NOT EXISTS monitor_website_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  website_id INT NOT NULL,
  status ENUM('online','offline','warning') DEFAULT 'online',
  response_time_ms INT DEFAULT NULL,
  http_status INT DEFAULT NULL,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (website_id) REFERENCES monitor_websites(id) ON DELETE CASCADE
);

-- Server monitoring
CREATE TABLE IF NOT EXISTS monitor_servers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  host VARCHAR(500) NOT NULL,
  type ENUM('vps','dedicated','docker','shared') DEFAULT 'vps',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server monitoring logs
CREATE TABLE IF NOT EXISTS monitor_server_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  server_id INT NOT NULL,
  cpu_usage DECIMAL(5,2) DEFAULT 0,
  ram_usage DECIMAL(5,2) DEFAULT 0,
  ram_total BIGINT DEFAULT 0,
  disk_usage DECIMAL(5,2) DEFAULT 0,
  disk_total BIGINT DEFAULT 0,
  load_1min DECIMAL(5,2) DEFAULT 0,
  load_5min DECIMAL(5,2) DEFAULT 0,
  load_15min DECIMAL(5,2) DEFAULT 0,
  status ENUM('online','warning','critical') DEFAULT 'online',
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (server_id) REFERENCES monitor_servers(id) ON DELETE CASCADE
);

-- AI Agent monitoring
CREATE TABLE IF NOT EXISTS monitor_ai_agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) DEFAULT 'openai',
  model VARCHAR(255) DEFAULT 'gpt-4',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Agent usage logs
CREATE TABLE IF NOT EXISTS monitor_ai_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  tokens_input INT DEFAULT 0,
  tokens_output INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  response_time_ms INT DEFAULT NULL,
  cost_estimate DECIMAL(10,6) DEFAULT 0,
  status ENUM('success','timeout','rate_limited','error') DEFAULT 'success',
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES monitor_ai_agents(id) ON DELETE CASCADE
);

-- Error logs (centralized error center)
CREATE TABLE IF NOT EXISTS monitor_errors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source ENUM('website','server','database','api','ai_agent','system') NOT NULL,
  severity ENUM('info','warning','critical') DEFAULT 'warning',
  code VARCHAR(100) DEFAULT NULL,
  message TEXT NOT NULL,
  details JSON DEFAULT NULL,
  recommendation TEXT DEFAULT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE IF NOT EXISTS monitor_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(255) NOT NULL,
  details JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SSL monitoring
CREATE TABLE IF NOT EXISTS monitor_ssl (
  id INT AUTO_INCREMENT PRIMARY KEY,
  website_id INT NOT NULL,
  issuer VARCHAR(255) DEFAULT NULL,
  valid_from DATE DEFAULT NULL,
  valid_to DATE DEFAULT NULL,
  days_left INT DEFAULT 0,
  is_valid BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (website_id) REFERENCES monitor_websites(id) ON DELETE CASCADE
);

-- Notifications config
CREATE TABLE IF NOT EXISTS monitor_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('website_down','server_high_cpu','server_high_ram','server_disk_full','ssl_expiring','ai_error','critical_error') NOT NULL,
  channel ENUM('email','whatsapp','telegram','dashboard') DEFAULT 'dashboard',
  is_active BOOLEAN DEFAULT TRUE,
  config JSON DEFAULT NULL
);

-- Indexes for performance
CREATE INDEX idx_website_logs_checked ON monitor_website_logs(website_id, checked_at);
CREATE INDEX idx_server_logs_checked ON monitor_server_logs(server_id, checked_at);
CREATE INDEX idx_ai_logs_created ON monitor_ai_logs(agent_id, created_at);
CREATE INDEX idx_errors_created ON monitor_errors(created_at);
CREATE INDEX idx_errors_source ON monitor_errors(source);

-- Seed default monitoring data
INSERT INTO monitor_websites (name, url) VALUES
  ('Garuda Nexa', 'https://garudanexa.com'),
  ('iSchool', 'https://ischool.my.id'),
  ('Sinar Lampung', 'https://sinarlampung.com');

INSERT INTO monitor_servers (name, host, type) VALUES
  ('Main Production', 'garudanexa.com', 'vps'),
  ('iSchool Server', 'ischool.my.id', 'vps');

INSERT INTO monitor_ai_agents (name, provider, model) VALUES
  ('Ollama Local', 'ollama', 'qwen2.5:14b'),
  ('Hermes Agent', 'hermes', 'command-code'),
  ('WhatsApp Bot', 'openai', 'gpt-4');
