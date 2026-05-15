<?php
$host = "localhost";
$user = "root";
$pass = "";
$db = "db_garudanexabahtera";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create table for visitor stats
$sql = "CREATE TABLE IF NOT EXISTS visitor_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_visits INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
    echo "SUCCESS: visitor_stats table created or already exists.\n";
    
    // Initialize if empty
    $check = $conn->query("SELECT id FROM visitor_stats WHERE id = 1");
    if ($check->num_rows == 0) {
        $conn->query("INSERT INTO visitor_stats (id, total_visits) VALUES (1, 1250)"); // Starting with a base number for aesthetics
        echo "Initialized visitor stats with 1250.\n";
    }
} else {
    echo "ERROR creating table: " . $conn->error . "\n";
}

$conn->close();
?>
