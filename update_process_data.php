<?php
$host = "localhost";
$user = "root";
$pass = "";
$db = "db_garudanexabahtera";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$process_data = [
    [
        "step" => "01",
        "title" => "Consultation",
        "desc" => "Needs Analysis & Planning",
        "back_title" => "DETAIL CONSULTATION",
        "detail" => "Kami memulai dengan mendalami visi bisnis Anda. Sesi brainstorming intensif untuk menentukan fitur utama, target pasar, dan strategi teknologi yang paling efektif untuk mencapai tujuan Anda."
    ],
    [
        "step" => "02",
        "title" => "Desain UI/UX",
        "desc" => "Wireframing & Prototyping",
        "back_title" => "DETAIL DESAIN UI/UX",
        "detail" => "Fokus pada pengalaman pengguna yang intuitif dan estetika modern. Kami membuat purwarupa interaktif sehingga Anda dapat merasakan alur navigasi aplikasi sebelum proses coding dimulai."
    ],
    [
        "step" => "03",
        "title" => "Development",
        "desc" => "Coding & System Testing",
        "back_title" => "DETAIL DEVELOPMENT",
        "detail" => "Tim engineer kami membangun sistem menggunakan teknologi terkini yang skalabel. Kami menerapkan standar keamanan tinggi dan pengujian menyeluruh (QA) untuk memastikan performa yang stabil."
    ],
    [
        "step" => "04",
        "title" => "Launching",
        "desc" => "Deployment & Maintenance",
        "back_title" => "DETAIL LAUNCHING",
        "detail" => "Membantu proses rilis ke App Store/Play Store atau hosting cloud. Kami tidak berhenti di sana; kami menyediakan dukungan teknis berkelanjutan dan pemeliharaan untuk menjaga sistem tetap prima."
    ]
];

$json_data = $conn->real_escape_string(json_encode($process_data));

$sql = "UPDATE hero_settings SET setting_value = '$json_data' WHERE setting_key = 'process_data'";
$conn->query($sql);

if ($conn->affected_rows == 0) {
    $sql_insert = "INSERT INTO hero_settings (setting_key, setting_value) VALUES ('process_data', '$json_data')";
    $conn->query($sql_insert);
}

echo "Database updated successfully!\n";
$conn->close();
?>
