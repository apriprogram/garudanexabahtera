-- 1. Website Monitoring
CREATE TABLE IF NOT EXISTS monitor_websites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    check_interval INT DEFAULT 5, -- minutes
    status ENUM('online', 'offline', 'warning') DEFAULT 'online',
    last_check DATETIME,
    response_time INT, -- ms
    ssl_expiry DATETIME,
    domain_expiry DATETIME,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Website Logs (Uptime/Response Time)
CREATE TABLE IF NOT EXISTS monitor_website_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    website_id INT,
    status VARCHAR(50),
    response_time INT,
    error_message TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES monitor_websites(id) ON DELETE CASCADE
);

-- 3. AI Usage Monitoring
CREATE TABLE IF NOT EXISTS monitor_ai_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT,
    user_id INT,
    website_id INT,
    model VARCHAR(100),
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    duration INT, -- ms
    status ENUM('success', 'error') DEFAULT 'success',
    error_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Visitor Stats (Aggregated)
CREATE TABLE IF NOT EXISTS visitor_stats_daily (
    id INT AUTO_INCREMENT PRIMARY KEY,
    website_id INT,
    date DATE,
    visitors INT DEFAULT 0,
    pageviews INT DEFAULT 0,
    UNIQUE KEY (website_id, date)
);

-- 5. Error Center (Global)
CREATE TABLE IF NOT EXISTS monitor_error_center (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source ENUM('website', 'server', 'ai', 'database', 'api') NOT NULL,
    severity ENUM('info', 'warning', 'critical') DEFAULT 'warning',
    category VARCHAR(100), -- 404, 500, Timeout, etc
    message TEXT,
    stack_trace TEXT,
    solution TEXT,
    is_resolved TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
