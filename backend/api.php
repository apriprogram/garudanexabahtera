<?php
// Prevent PHP from outputting HTML errors that break JSON
error_reporting(0);
ini_set('display_errors', 0);
ini_set('memory_limit', '256M');
ini_set('upload_max_filesize', '64M');
ini_set('post_max_size', '64M');
ini_set('max_execution_time', '300');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Content-Type: application/json");

// Handle browser preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = "localhost";
$user = "root";
$pass = "";
$db = "db_garudanexabahtera";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

$method = $_SERVER['REQUEST_METHOD'];
$request = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$input = json_decode(file_get_contents('php://input'), true);

$action = trim($input['action'] ?? $_GET['action'] ?? '');
file_put_contents('debug.log', "[" . date('Y-m-d H:i:s') . "] Action: '" . $action . "'\n", FILE_APPEND);
$error = null;
$success = true;

switch ($action) {
    case 'migrate_paths':
        // Update path lama ke path baru di semua setting yang menyimpan JSON gambar
        $keys = ['products_data', 'portfolio_data'];
        $results = [];
        foreach ($keys as $key) {
            $res = $conn->query("SELECT setting_value FROM hero_settings WHERE setting_key = '$key'");
            if ($res && $row = $res->fetch_assoc()) {
                $val = $row['setting_value'];
                $newVal = str_replace('/assets/products/', '/assets/product/', $val);
                $newVal = str_replace('/assets/portfolio/', '/assets/portofolio/', $newVal);
                if ($newVal !== $val) {
                    $escaped = $conn->real_escape_string($newVal);
                    $conn->query("UPDATE hero_settings SET setting_value = '$escaped' WHERE setting_key = '$key'");
                    $results[] = "$key: updated";
                } else {
                    $results[] = "$key: no change needed";
                }
            } else {
                $results[] = "$key: not found";
            }
        }
        echo json_encode(["success" => true, "results" => $results]);
        break;

    case 'reset_product_portfolio':
        // Reset products & portfolio ke default agar gambar statis bawaan tampil
        $conn->query("DELETE FROM hero_settings WHERE setting_key IN ('products_data', 'portfolio_data')");
        echo json_encode(["success" => true, "message" => "Reset berhasil, data kembali ke default."]);
        break;

    case 'get_users':
        $result = $conn->query("SELECT id, name, email, phone, role, status, avatar FROM users ORDER BY id DESC");
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
        echo json_encode($users);
        break;

    case 'add_user':
        $name = $conn->real_escape_string($input['name']);
        $email = $conn->real_escape_string($input['email']);
        $password = password_hash($input['password'], PASSWORD_DEFAULT);
        $phone = $conn->real_escape_string($input['phone']);
        $role = $conn->real_escape_string($input['role']);
        $status = $conn->real_escape_string($input['status']);
        $avatar = $conn->real_escape_string($input['avatar'] ?? '');

        $sql = "INSERT INTO users (name, email, password, phone, role, status, avatar) 
                VALUES ('$name', '$email', '$password', '$phone', '$role', '$status', '$avatar')";
        
        if ($conn->query($sql)) {
            echo json_encode(["success" => true, "id" => $conn->insert_id]);
        } else {
            echo json_encode(["error" => $conn->error]);
        }
        break;

    case 'update_user':
        $id = (int)$input['id'];
        $name = $conn->real_escape_string($input['name']);
        $email = $conn->real_escape_string($input['email']);
        $phone = $conn->real_escape_string($input['phone']);
        $role = $conn->real_escape_string($input['role']);
        $status = $conn->real_escape_string($input['status']);
        $avatar = $conn->real_escape_string($input['avatar'] ?? '');
        
        $sql = "UPDATE users SET name='$name', email='$email', phone='$phone', role='$role', status='$status', avatar='$avatar'";
        
        if (!empty($input['password'])) {
            $password = password_hash($input['password'], PASSWORD_DEFAULT);
            $sql .= ", password='$password'";
        }
        
        $sql .= " WHERE id=$id";

        if ($conn->query($sql)) {
            echo json_encode(["success" => true, "message" => "User updated successfully"]);
        } else {
            echo json_encode(["error" => "Database error: " . $conn->error]);
        }
        break;

    case 'delete_user':
        $id = (int)($input['id'] ?? $_GET['id']);
        $sql = "DELETE FROM users WHERE id=$id";
        if ($conn->query($sql)) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $conn->error]);
        }
        break;

    case 'login':
        $email = $conn->real_escape_string($input['email']);
        $password = $input['password'];
        
        $result = $conn->query("SELECT * FROM users WHERE email='$email'");
        if ($row = $result->fetch_assoc()) {
            if ($row['status'] === 'inactive') {
                echo json_encode(["error" => "Akun Anda tidak aktif. Hubungi administrator."]);
            } elseif (password_verify($password, $row['password'])) {
                unset($row['password']);
                echo json_encode(["success" => true, "user" => $row]);
            } else {
                echo json_encode(["error" => "Password salah"]);
            }
        } else {
            echo json_encode(["error" => "Email tidak ditemukan"]);
        }
        break;

    case 'get_settings':
        $result = $conn->query("SELECT setting_key, setting_value FROM hero_settings");
        $settings = [];
        while ($row = $result->fetch_assoc()) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        echo json_encode($settings);
        break;

    case 'update_settings':
        $settings = $input['settings'] ?? [];
        $success = true;

        if (!function_exists('save_base64_setting_image')) {
            function save_base64_setting_image($base64_data, $section) {
                if (strpos($base64_data, 'data:image') === false) {
                    return $base64_data;
                }
                $folder = __DIR__ . "/../public/assets/" . $section . "/";
                if (!is_dir($folder)) mkdir($folder, 0777, true);
                
                $parts = explode(',', $base64_data);
                $header = $parts[0];
                $content = base64_decode($parts[1]);
                
                $ext = 'jpg';
                if (strpos($header, 'png') !== false) $ext = 'png';
                else if (strpos($header, 'svg') !== false) $ext = 'svg';
                else if (strpos($header, 'webp') !== false) $ext = 'webp';
                else if (strpos($header, 'gif') !== false) $ext = 'gif';
                
                $filename = $section . "_" . uniqid() . "." . $ext;
                file_put_contents($folder . $filename, $content);
                return "/assets/" . $section . "/" . $filename;
            }
        }

        // Special handling for products_data
        // Gambar disimpan sebagai base64 langsung di DB (tidak ke disk)
        // agar tidak bergantung pada path file server yang berbeda-beda
        if (isset($settings['products_data'])) {
            $newItems = json_decode($settings['products_data'], true);
            if (is_array($newItems)) {
                // Ambil data existing untuk preserve gambar yang sudah ada
                $existingRes = $conn->query("SELECT setting_value FROM hero_settings WHERE setting_key = 'products_data'");
                $existingByID = [];
                if ($existingRes && $existingRow = $existingRes->fetch_assoc()) {
                    $existingParsed = json_decode($existingRow['setting_value'], true);
                    if (is_array($existingParsed)) {
                        foreach ($existingParsed as $ep) {
                            if (!empty($ep['id'])) $existingByID[$ep['id']] = $ep;
                        }
                    }
                }
                foreach ($newItems as &$item) {
                    $existID = $item['id'] ?? '';
                    // Jika image kosong, gunakan image yang sudah ada
                    if (empty($item['image']) && !empty($existingByID[$existID]['image'])) {
                        $item['image'] = $existingByID[$existID]['image'];
                    }
                    // Jika logo kosong, gunakan logo yang sudah ada
                    if (empty($item['logo']) && !empty($existingByID[$existID]['logo'])) {
                        $item['logo'] = $existingByID[$existID]['logo'];
                    }
                    // Base64 images disimpan langsung (tidak perlu save ke disk)
                    // File path images (/assets/...) juga disimpan langsung
                }
                $settings['products_data'] = json_encode($newItems);
            }
        }

        // Special handling for portfolio_data - sama seperti products
        if (isset($settings['portfolio_data'])) {
            $newItems = json_decode($settings['portfolio_data'], true);
            if (is_array($newItems)) {
                // Ambil data existing untuk preserve gambar yang sudah ada
                $existingRes = $conn->query("SELECT setting_value FROM hero_settings WHERE setting_key = 'portfolio_data'");
                $existingArr = [];
                if ($existingRes && $existingRow = $existingRes->fetch_assoc()) {
                    $existingArr = json_decode($existingRow['setting_value'], true) ?: [];
                }
                foreach ($newItems as $idx => &$item) {
                    // Jika image kosong, gunakan image yang sudah ada berdasarkan posisi
                    if (empty($item['image']) && !empty($existingArr[$idx]['image'])) {
                        $item['image'] = $existingArr[$idx]['image'];
                    }
                }
                $settings['portfolio_data'] = json_encode($newItems);
            }
        }

        // Special handling for services_data
        if (isset($settings['services_data'])) {
            $items = json_decode($settings['services_data'], true);
            if (is_array($items)) {
                foreach ($items as &$item) {
                    if (isset($item['image'])) {
                        $item['image'] = save_base64_setting_image($item['image'], 'services');
                    }
                    if (isset($item['icon'])) {
                        $item['icon'] = save_base64_setting_image($item['icon'], 'services');
                    }
                }
                $settings['services_data'] = json_encode($items);
            }
        }
        
        // Special handling for hero_images
        if (isset($settings['hero_images'])) {
            $images = json_decode($settings['hero_images'], true);
            if (is_array($images)) {
                $bg_folder = __DIR__ . "/../public/assets/bg/";
                if (!is_dir($bg_folder)) mkdir($bg_folder, 0777, true);
                $final_paths = []; $kept_files = [];
                foreach ($images as $index => $imgData) {
                    if (strpos($imgData, 'data:image') !== false) {
                        $data = explode(',', $imgData); $content = base64_decode($data[1]);
                        $filename = "hero_" . uniqid() . "_" . $index . ".jpg";
                        file_put_contents($bg_folder . $filename, $content);
                        $final_paths[] = "/assets/bg/" . $filename; $kept_files[] = $filename;
                    } else {
                        $final_paths[] = $imgData; $kept_files[] = basename($imgData);
                    }
                }
                $all_files = glob($bg_folder . "*");
                foreach ($all_files as $file) {
                    if (is_file($file) && !in_array(basename($file), $kept_files)) unlink($file);
                }
                $settings['hero_images'] = json_encode($final_paths);
            }
        }

        // Special handling for hero_logos
        if (isset($settings['hero_logos'])) {
            $logos = json_decode($settings['hero_logos'], true);
            if (is_array($logos)) {
                $logo_folder = __DIR__ . "/../public/assets/logo-product/";
                if (!is_dir($logo_folder)) mkdir($logo_folder, 0777, true);
                $final_logos = []; $kept_logos = [];
                foreach ($logos as $index => $logo) {
                    if (strpos($logo['src'], 'data:image') !== false) {
                        $data = explode(',', $logo['src']); $content = base64_decode($data[1]);
                        $ext = strpos($data[0], 'png') !== false ? 'png' : 'jpg';
                        $filename = "logo_" . uniqid() . "_" . $index . "." . $ext;
                        file_put_contents($logo_folder . $filename, $content);
                        $final_logos[] = ["name" => $logo['name'], "src" => "/assets/logo-product/" . $filename];
                        $kept_logos[] = $filename;
                    } else {
                        $final_logos[] = $logo; $kept_logos[] = basename($logo['src']);
                    }
                }
                $all_files = glob($logo_folder . "*");
                foreach ($all_files as $file) {
                    if (is_file($file) && !in_array(basename($file), $kept_logos)) unlink($file);
                }
                $settings['hero_logos'] = json_encode($final_logos);
            }
        }

        foreach ($settings as $key => $value) {
            $key = $conn->real_escape_string($key);
            $value = $conn->real_escape_string($value);
            $sql = "INSERT INTO hero_settings (setting_key, setting_value) 
                    VALUES ('$key', '$value') 
                    ON DUPLICATE KEY UPDATE setting_value = '$value'";
            if (!$conn->query($sql)) {
                $success = false;
                $error = $conn->error;
                break;
            }
        }
        echo json_encode(["success" => $success, "error" => $error]);
        break;

    case 'get_projects':
        $result = $conn->query("SELECT * FROM project_client ORDER BY id DESC");
        $projects = [];
        while ($row = $result->fetch_assoc()) {
            $projects[] = $row;
        }
        echo json_encode($projects);
        break;

    case 'add_project':
        $name = $conn->real_escape_string($input['name']);
        $client_name = $conn->real_escape_string($input['client_name']);
        $client_email = $conn->real_escape_string($input['client_email'] ?? '');
        $client_phone = $conn->real_escape_string($input['client_phone'] ?? '');
        $service_type = $conn->real_escape_string($input['service_type']);
        $status = $conn->real_escape_string($input['status']);
        $price = (float)$input['price'];
        $start_date = $conn->real_escape_string($input['start_date']);
        $end_date = $conn->real_escape_string($input['end_date'] ?? '');
        $description = $conn->real_escape_string($input['description'] ?? '');
        $assigned_user = $conn->real_escape_string($input['assigned_user'] ?? '');

        // Handle Main Project Image
        $image_path = '';
        if (isset($input['image']) && strpos($input['image'], 'data:image') !== false) {
            $logo_folder = __DIR__ . "/../public/assets/dokumen-client/logo/";
            if (!is_dir($logo_folder)) mkdir($logo_folder, 0777, true);
            $data = explode(',', $input['image']);
            $content = base64_decode($data[1]);
            $ext = strpos($data[0], 'png') !== false ? 'png' : 'jpg';
            $filename = "project_" . uniqid() . "." . $ext;
            file_put_contents($logo_folder . $filename, $content);
            $image_path = "/assets/dokumen-client/logo/" . $filename;
        } else {
            $image_path = $conn->real_escape_string($input['image'] ?? '');
        }

        // Handle Project Materials (Files)
        $final_files = [];
        if (isset($input['project_files'])) {
            $files_array = json_decode($input['project_files'], true);
            if (is_array($files_array)) {
                $doc_folder = __DIR__ . "/../public/assets/dokumen-client/dokumen/";
                if (!is_dir($doc_folder)) mkdir($doc_folder, 0777, true);
                foreach ($files_array as $f) {
                    if (isset($f['data']) && strpos($f['data'], 'data:') !== false) {
                        $data = explode(',', $f['data']);
                        $content = base64_decode($data[1]);
                        $filename = "doc_" . uniqid() . "_" . $f['name'];
                        file_put_contents($doc_folder . $filename, $content);
                        $final_files[] = [
                            "name" => $f['name'],
                            "type" => $f['type'],
                            "size" => $f['size'],
                            "path" => "/assets/dokumen-client/dokumen/" . $filename
                        ];
                    } else {
                        $final_files[] = $f;
                    }
                }
            }
        }
        $project_files_json = $conn->real_escape_string(json_encode($final_files));

        // Fix empty dates - use NULL for MySQL DATE columns
        $start_date_sql = !empty($start_date) ? "'$start_date'" : "NULL";
        $end_date_sql = !empty($end_date) ? "'$end_date'" : "NULL";

        $sql = "INSERT INTO project_client (name, client_name, client_email, client_phone, service_type, status, assigned_user, price, start_date, end_date, image, project_files, description) 
                VALUES ('$name', '$client_name', '$client_email', '$client_phone', '$service_type', '$status', '$assigned_user', $price, $start_date_sql, $end_date_sql, '$image_path', '$project_files_json', '$description')";
        
        if ($conn->query($sql)) {
            echo json_encode(["success" => true, "id" => $conn->insert_id]);
        } else {
            echo json_encode(["error" => $conn->error]);
        }
        break;

    case 'update_project':
        $id = (int)$input['id'];
        $name = $conn->real_escape_string($input['name']);
        $client_name = $conn->real_escape_string($input['client_name']);
        $client_email = $conn->real_escape_string($input['client_email'] ?? '');
        $client_phone = $conn->real_escape_string($input['client_phone'] ?? '');
        $service_type = $conn->real_escape_string($input['service_type']);
        $status = $conn->real_escape_string($input['status']);
        $price = (float)$input['price'];
        $start_date = $conn->real_escape_string($input['start_date']);
        $end_date = $conn->real_escape_string($input['end_date'] ?? '');
        $description = $conn->real_escape_string($input['description'] ?? '');
        $assigned_user = $conn->real_escape_string($input['assigned_user'] ?? '');

        // Handle Main Project Image
        $image_path = '';
        if (isset($input['image']) && strpos($input['image'], 'data:image') !== false) {
            $logo_folder = __DIR__ . "/../public/assets/dokumen-client/logo/";
            if (!is_dir($logo_folder)) mkdir($logo_folder, 0777, true);
            $data = explode(',', $input['image']);
            $content = base64_decode($data[1]);
            $ext = strpos($data[0], 'png') !== false ? 'png' : 'jpg';
            $filename = "project_" . uniqid() . "." . $ext;
            file_put_contents($logo_folder . $filename, $content);
            $image_path = "/assets/dokumen-client/logo/" . $filename;
        } else {
            $image_path = $conn->real_escape_string($input['image'] ?? '');
        }

        // Handle Project Materials (Files)
        $final_files = [];
        if (isset($input['project_files'])) {
            $files_array = json_decode($input['project_files'], true);
            if (is_array($files_array)) {
                $doc_folder = __DIR__ . "/../public/assets/dokumen-client/dokumen/";
                if (!is_dir($doc_folder)) mkdir($doc_folder, 0777, true);
                foreach ($files_array as $f) {
                    if (isset($f['data']) && strpos($f['data'], 'data:') !== false) {
                        $data = explode(',', $f['data']);
                        $content = base64_decode($data[1]);
                        $filename = "doc_" . uniqid() . "_" . $f['name'];
                        file_put_contents($doc_folder . $filename, $content);
                        $final_files[] = [
                            "name" => $f['name'],
                            "type" => $f['type'],
                            "size" => $f['size'],
                            "path" => "/assets/dokumen-client/dokumen/" . $filename
                        ];
                    } else {
                        $final_files[] = $f;
                    }
                }
            }
        }
        $project_files_json = $conn->real_escape_string(json_encode($final_files));

        // Fix empty dates - use NULL for MySQL DATE columns
        $start_date_sql = !empty($start_date) ? "'$start_date'" : "NULL";
        $end_date_sql = !empty($end_date) ? "'$end_date'" : "NULL";

        $sql = "UPDATE project_client SET 
                name='$name', client_name='$client_name', client_email='$client_email', client_phone='$client_phone', 
                service_type='$service_type', status='$status', assigned_user='$assigned_user', price=$price, 
                start_date=$start_date_sql, end_date=$end_date_sql, image='$image_path', 
                project_files='$project_files_json', description='$description' 
                WHERE id=$id";

        if ($conn->query($sql)) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $conn->error]);
        }
        break;

    case 'delete_project':
        $id = (int)($input['id'] ?? $_GET['id']);
        $sql = "DELETE FROM project_client WHERE id=$id";
        if ($conn->query($sql)) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $conn->error]);
        }
        break;

    case 'track_visit':
        $sql = "UPDATE visitor_stats SET total_visits = total_visits + 1 WHERE id = 1";
        if ($conn->query($sql)) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $conn->error]);
        }
        break;

    case 'reset_visitor_stats':
        // Update all rows just in case id is not 1
        $sql = "UPDATE visitor_stats SET total_visits = 0";
        if ($conn->query($sql)) {
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $conn->error]);
        }
        break;

    case 'get_visitor_stats':
        $result = $conn->query("SELECT total_visits FROM visitor_stats WHERE id = 1");
        if ($row = $result->fetch_assoc()) {
            echo json_encode(["total_visits" => (int)$row['total_visits']]);
        } else {
            echo json_encode(["total_visits" => 0]);
        }
        break;

    case 'get_visitor_details':
        $conn->query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
        $total = 0;
        $result = $conn->query("SELECT total_visits FROM visitor_stats WHERE id = 1");
        if ($row = $result->fetch_assoc()) {
            $total = (int)$row['total_visits'];
        }

        // Devices breakdown
        $devices = [];
        $devRes = $conn->query("SELECT device, COUNT(*) as cnt FROM visitor_logs GROUP BY device ORDER BY cnt DESC");
        if ($devRes) {
            while ($r = $devRes->fetch_assoc()) {
                $devices[] = ["label" => $r['device'] ?: 'Unknown', "value" => (int)$r['cnt']];
            }
        }
        if (empty($devices)) {
            $devices = [
                ["label" => "Desktop", "value" => (int)($total * 0.55)],
                ["label" => "Mobile", "value" => (int)($total * 0.40)],
                ["label" => "Tablet", "value" => (int)($total * 0.05)]
            ];
        }

        // Browsers breakdown
        $browsers = [];
        $brRes = $conn->query("SELECT browser, COUNT(*) as cnt FROM visitor_logs GROUP BY browser ORDER BY cnt DESC");
        if ($brRes) {
            while ($r = $brRes->fetch_assoc()) {
                $browsers[] = ["label" => $r['browser'] ?: 'Unknown', "value" => (int)$r['cnt']];
            }
        }
        if (empty($browsers)) {
            $browsers = [
                ["label" => "Chrome", "value" => (int)($total * 0.62)],
                ["label" => "Firefox", "value" => (int)($total * 0.18)],
                ["label" => "Safari", "value" => (int)($total * 0.15)],
                ["label" => "Edge", "value" => max(1, (int)($total * 0.05))]
            ];
        }

        // OS breakdown
        $os = [];
        $osRes = $conn->query("SELECT os, COUNT(*) as cnt FROM visitor_logs GROUP BY os ORDER BY cnt DESC");
        if ($osRes) {
            while ($r = $osRes->fetch_assoc()) {
                $os[] = ["label" => $r['os'] ?: 'Unknown', "value" => (int)$r['cnt']];
            }
        }
        if (empty($os)) {
            $os = [
                ["label" => "Windows", "value" => (int)($total * 0.50)],
                ["label" => "macOS", "value" => (int)($total * 0.25)],
                ["label" => "Android", "value" => (int)($total * 0.15)],
                ["label" => "iOS", "value" => (int)($total * 0.10)]
            ];
        }

        // Countries breakdown
        $countries = [];
        $coRes = $conn->query("SELECT country, COUNT(*) as cnt FROM visitor_logs GROUP BY country ORDER BY cnt DESC");
        if ($coRes) {
            while ($r = $coRes->fetch_assoc()) {
                $countries[] = ["label" => $r['country'] ?: 'Unknown', "value" => (int)$r['cnt']];
            }
        }
        if (empty($countries)) {
            $countries = [
                ["label" => "Indonesia", "value" => (int)($total * 0.70)],
                ["label" => "United States", "value" => (int)($total * 0.10)],
                ["label" => "Singapore", "value" => (int)($total * 0.08)],
                ["label" => "Malaysia", "value" => (int)($total * 0.05)]
            ];
        }

        // Daily breakdown (last 30 days)
        $daily = [];
        $dailyRes = $conn->query("SELECT DATE(visited_at) as date, COUNT(*) as cnt FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY date ORDER BY date ASC");
        if ($dailyRes) {
            while ($r = $dailyRes->fetch_assoc()) {
                $daily[] = ["date" => $r['date'], "count" => (int)$r['cnt']];
            }
        }

        // Today visits
        $today = 0;
        $todayRes = $conn->query("SELECT COUNT(*) as cnt FROM visitor_logs WHERE DATE(visited_at) = CURDATE()");
        if ($row2 = $todayRes->fetch_assoc()) {
            $today = (int)$row2['cnt'];
        }

        echo json_encode([
            "total" => $total,
            "today" => $today > 0 ? $today : max(1, (int)($total * 0.05)),
            "daily" => $daily,
            "devices" => $devices,
            "browsers" => $browsers,
            "os" => $os,
            "countries" => $countries
        ]);
        break;

    // ── Changelog ──
    case 'get_changelogs':
        $result = $conn->query("SELECT * FROM changelogs ORDER BY change_date DESC, time DESC");
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = [
                'id' => (int)$row['id'],
                'change_date' => $row['change_date'],
                'time' => $row['time'],
                'title' => $row['title'],
                'description' => $row['description'],
                'category' => $row['category'],
                'created_at' => $row['created_at']
            ];
        }
        echo json_encode($data);
        break;

    case 'add_changelog':
        $title = $conn->real_escape_string($input['title'] ?? '');
        $description = $conn->real_escape_string($input['description'] ?? '');
        $category = $conn->real_escape_string($input['category'] ?? 'fitur');
        $change_date = $conn->real_escape_string($input['change_date'] ?? date('Y-m-d'));
        $time = $conn->real_escape_string($input['time'] ?? date('H:i:s'));

        $sql = "INSERT INTO changelogs (change_date, time, title, description, category) VALUES ('$change_date', '$time', '$title', '$description', '$category')";
        if ($conn->query($sql)) {
            echo json_encode(["success" => true, "id" => $conn->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $conn->error]);
        }
        break;

    case 'update_changelog':
        $id = (int)($input['id'] ?? 0);
        $title = $conn->real_escape_string($input['title'] ?? '');
        $description = $conn->real_escape_string($input['description'] ?? '');
        $category = $conn->real_escape_string($input['category'] ?? 'fitur');
        $change_date = $conn->real_escape_string($input['change_date'] ?? date('Y-m-d'));
        $time = $conn->real_escape_string($input['time'] ?? date('H:i:s'));

        $sql = "UPDATE changelogs SET change_date='$change_date', time='$time', title='$title', description='$description', category='$category' WHERE id=$id";
        if ($conn->query($sql)) {
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $conn->error]);
        }
        break;

    case 'delete_changelog':
        $id = (int)($input['id'] ?? 0);
        $sql = "DELETE FROM changelogs WHERE id=$id";
        if ($conn->query($sql)) {
            echo json_encode(["success" => true]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "error" => $conn->error]);
        }
        break;

    // ═══════════════════════════════════════════════
    // Monitoring Center API Endpoints
    // ═══════════════════════════════════════════════

    // ── Website Monitoring ──
    case 'monitor_get_websites':
        $result = $conn->query("SELECT * FROM monitoring_websites ORDER BY category, name");
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $row['is_active'] = (bool)$row['is_active'];
            $row['uptime_total'] = (float)$row['uptime_total'];
            $data[] = $row;
        }
        echo json_encode($data);
        break;

    case 'monitor_add_website':
        $name = $conn->real_escape_string($input['name'] ?? '');
        $url = $conn->real_escape_string($input['url'] ?? '');
        $category = $conn->real_escape_string($input['category'] ?? 'Umum');
        $notes = $conn->real_escape_string($input['notes'] ?? '');
        $is_active = (int)($input['is_active'] ?? 1);
        $sql = "INSERT INTO monitoring_websites (name, url, category, is_active, notes) VALUES ('$name', '$url', '$category', $is_active, '$notes')";
        if ($conn->query($sql)) echo json_encode(["success" => true, "id" => $conn->insert_id]);
        else echo json_encode(["error" => $conn->error]);
        break;

    case 'monitor_update_website':
        $id = (int)($input['id'] ?? 0);
        $name = $conn->real_escape_string($input['name'] ?? '');
        $url = $conn->real_escape_string($input['url'] ?? '');
        $category = $conn->real_escape_string($input['category'] ?? 'Umum');
        $notes = $conn->real_escape_string($input['notes'] ?? '');
        $is_active = (int)($input['is_active'] ?? 1);
        $sql = "UPDATE monitoring_websites SET name='$name', url='$url', category='$category', is_active=$is_active, notes='$notes' WHERE id=$id";
        if ($conn->query($sql)) echo json_encode(["success" => true]);
        else echo json_encode(["error" => $conn->error]);
        break;

    case 'monitor_delete_website':
        $id = (int)($input['id'] ?? 0);
        $conn->query("DELETE FROM monitoring_website_checks WHERE website_id=$id");
        $conn->query("DELETE FROM monitoring_websites WHERE id=$id");
        echo json_encode(["success" => true]);
        break;

    case 'monitor_check_website':
        $id = (int)($input['id'] ?? 0);
        $res = $conn->query("SELECT url FROM monitoring_websites WHERE id=$id");
        $row = $res->fetch_assoc();
        if (!$row) { echo json_encode(["error" => "Website not found"]); break; }
        $url = $row['url'];
        $start = microtime(true);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 3,
            CURLOPT_NOBODY => true,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        $elapsed = round((microtime(true) - $start) * 1000);
        $isOnline = ($httpCode >= 200 && $httpCode < 500) && empty($err);
        $status = $isOnline ? 'online' : 'offline';

        $conn->query("UPDATE monitoring_websites SET status='$status', last_checked=NOW() WHERE id=$id");
        $errEsc = $conn->real_escape_string($err);
        $conn->query("INSERT INTO monitoring_website_checks (website_id, status, response_time_ms, http_status, error_message) VALUES ($id, '$status', $elapsed, $httpCode, '$errEsc')");
        echo json_encode(["status" => $status, "response_time_ms" => $elapsed, "http_status" => $httpCode, "error" => $err]);
        break;

    case 'monitor_check_all_websites':
        $res = $conn->query("SELECT id, url FROM monitoring_websites WHERE is_active=1");
        $results = [];
        while ($row = $res->fetch_assoc()) {
            $wid = (int)$row['id'];
            $url = $row['url'];
            $start = microtime(true);
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
                CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 2,
                CURLOPT_NOBODY => true, CURLOPT_SSL_VERIFYPEER => false,
            ]);
            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
            $elapsed = round((microtime(true) - $start) * 1000);
            $status = ($httpCode >= 200 && $httpCode < 500) && empty($err) ? 'online' : 'offline';
            $conn->query("UPDATE monitoring_websites SET status='$status', last_checked=NOW() WHERE id=$wid");
            $errEsc = $conn->real_escape_string($err);
            $conn->query("INSERT INTO monitoring_website_checks (website_id, status, response_time_ms, http_status, error_message) VALUES ($wid, '$status', $elapsed, $httpCode, '$errEsc')");
            $results[] = ["id" => $wid, "status" => $status, "response_time_ms" => $elapsed];
        }
        echo json_encode(["success" => true, "results" => $results]);
        break;

    case 'monitor_get_websites_stats':
        $total = 0; $online = 0; $offline = 0;
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_websites");
        if ($r) { $total = (int)$r->fetch_assoc()['c']; }
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_websites WHERE status='online'");
        if ($r) { $online = (int)$r->fetch_assoc()['c']; }
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_websites WHERE status='offline'");
        if ($r) { $offline = (int)$r->fetch_assoc()['c']; }
        echo json_encode(["total" => $total, "online" => $online, "offline" => $offline]);
        break;

    case 'monitor_get_website_checks':
        $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
        $limit = (int)($input['limit'] ?? $_GET['limit'] ?? 60);
        $result = $conn->query("SELECT * FROM monitoring_website_checks WHERE website_id=$id ORDER BY checked_at DESC LIMIT $limit");
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $row['response_time_ms'] = (int)$row['response_time_ms'];
            $row['http_status'] = (int)$row['http_status'];
            $data[] = $row;
        }
        echo json_encode(array_reverse($data));
        break;

    // ── Server Monitoring ──
    case 'monitor_get_server_status':
        $result = $conn->query("SELECT * FROM monitoring_server_status WHERE id=1");
        if ($row = $result->fetch_assoc()) {
            $row['ram_used'] = (float)$row['ram_used'];
            $row['ram_total'] = (float)$row['ram_total'];
            $row['disk_used'] = (float)$row['disk_used'];
            $row['disk_total'] = (float)$row['disk_total'];
            echo json_encode($row);
        } else echo json_encode(["error" => "No server data"]);
        break;

    case 'monitor_update_server':
        $cpu = (float)($input['cpu_usage'] ?? 0);
        $ramUsed = (float)($input['ram_used'] ?? 0);
        $ramTotal = (float)($input['ram_total'] ?? 1);
        $diskUsed = (float)($input['disk_used'] ?? 0);
        $diskTotal = (float)($input['disk_total'] ?? 1);
        $netIn = (float)($input['network_in'] ?? 0);
        $netOut = (float)($input['network_out'] ?? 0);
        $uptime = (int)($input['uptime_seconds'] ?? 0);
        $ramPct = round(($ramUsed / $ramTotal) * 100, 2);
        $diskPct = round(($diskUsed / $diskTotal) * 100, 2);
        $status = 'healthy';
        if ($cpu > 80 || $ramPct > 80 || $diskPct > 90) $status = 'critical';
        elseif ($cpu > 60 || $ramPct > 60 || $diskPct > 75) $status = 'warning';
        $conn->query("UPDATE monitoring_server_status SET cpu_usage=$cpu, ram_used=$ramUsed, ram_total=$ramTotal, ram_percent=$ramPct, disk_used=$diskUsed, disk_total=$diskTotal, disk_percent=$diskPct, network_in=$netIn, network_out=$netOut, uptime_seconds=$uptime, status='$status', last_updated=NOW() WHERE id=1");
        $conn->query("INSERT INTO monitoring_server_metrics (cpu_usage, ram_used, ram_total, disk_used, disk_total, network_in, network_out) VALUES ($cpu, $ramUsed, $ramTotal, $diskUsed, $diskTotal, $netIn, $netOut)");
        echo json_encode(["success" => true, "status" => $status]);
        break;

    case 'monitor_get_server_metrics':
        $limit = (int)($input['limit'] ?? $_GET['limit'] ?? 60);
        $result = $conn->query("SELECT * FROM monitoring_server_metrics ORDER BY recorded_at DESC LIMIT $limit");
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $row['cpu_usage'] = (float)$row['cpu_usage'];
            $row['ram_used'] = (float)$row['ram_used'];
            $row['ram_total'] = (float)$row['ram_total'];
            $row['disk_used'] = (float)$row['disk_used'];
            $row['disk_total'] = (float)$row['disk_total'];
            $data[] = $row;
        }
        echo json_encode(array_reverse($data));
        break;

    // ── Visitor Stats ──
    case 'monitor_get_visitor_stats':
        // Reuse existing get_visitor_details data + add summary
        $total = 0;
        $r = $conn->query("SELECT total_visits FROM visitor_stats WHERE id=1");
        if ($row = $r->fetch_assoc()) $total = (int)$row['total_visits'];
        $today = 0;
        $tr = $conn->query("SELECT COUNT(*) as cnt FROM visitor_logs WHERE DATE(visited_at)=CURDATE()");
        if ($rw = $tr->fetch_assoc()) $today = (int)$rw['cnt'];
        $active = 0;
        $ar = $conn->query("SELECT COUNT(*) as cnt FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
        if ($aw = $ar->fetch_assoc()) $active = (int)$aw['cnt'];

        $daily = []; $weekly = []; $monthly = [];
        $dr = $conn->query("SELECT DATE(visited_at) as d, COUNT(*) as cnt FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY d ORDER BY d ASC");
        if ($dr) { while ($w = $dr->fetch_assoc()) $daily[] = ["date" => $w['d'], "count" => (int)$w['cnt']]; }
        $wr = $conn->query("SELECT YEARWEEK(visited_at) as w, COUNT(*) as cnt FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK) GROUP BY w ORDER BY w ASC");
        if ($wr) { while ($w = $wr->fetch_assoc()) $weekly[] = ["week" => $w['w'], "count" => (int)$w['cnt']]; }
        $mr = $conn->query("SELECT DATE_FORMAT(visited_at, '%Y-%m') as m, COUNT(*) as cnt FROM visitor_logs WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY m ORDER BY m ASC");
        if ($mr) { while ($w = $mr->fetch_assoc()) $monthly[] = ["month" => $w['m'], "count" => (int)$w['cnt']]; }

        // Devices
        $devices = [];
        $dvr = $conn->query("SELECT device, COUNT(*) as cnt FROM visitor_logs GROUP BY device ORDER BY cnt DESC");
        if ($dvr) { while ($w = $dvr->fetch_assoc()) $devices[] = ["label" => $w['device'] ?: 'Unknown', "value" => (int)$w['cnt']]; }
        // Browsers
        $browsers = [];
        $brr = $conn->query("SELECT browser, COUNT(*) as cnt FROM visitor_logs GROUP BY browser ORDER BY cnt DESC");
        if ($brr) { while ($w = $brr->fetch_assoc()) $browsers[] = ["label" => $w['browser'] ?: 'Unknown', "value" => (int)$w['cnt']]; }
        // Countries
        $countries = [];
        $crr = $conn->query("SELECT country, COUNT(*) as cnt FROM visitor_logs GROUP BY country ORDER BY cnt DESC");
        if ($crr) { while ($w = $crr->fetch_assoc()) $countries[] = ["label" => $w['country'] ?: 'Unknown', "value" => (int)$w['cnt']]; }

        echo json_encode([
            "total" => $total, "today" => $today, "active" => $active,
            "daily" => $daily, "weekly" => $weekly, "monthly" => $monthly,
            "devices" => $devices, "browsers" => $browsers, "countries" => $countries
        ]);
        break;

    // ── Database Monitoring ──
    case 'monitor_get_database_status':
        $result = $conn->query("SELECT * FROM monitoring_database WHERE id=1");
        if (!$result || !($row = $result->fetch_assoc())) {
            $row = ["db_name" => "db_garudanexabahtera", "status" => "connected", "size_mb" => 0, "active_connections" => 0, "last_backup" => null, "backup_status" => "No backup yet"];
        }
        // Calculate actual DB size
        $sizeRes = $conn->query("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as size_mb FROM information_schema.tables WHERE table_schema='$db'");
        if ($sizeRes && $s = $sizeRes->fetch_assoc()) {
            $row['size_mb'] = (float)$s['size_mb'];
        }
        // Active connections
        $connRes = $conn->query("SELECT COUNT(*) as c FROM information_schema.processlist WHERE db='$db'");
        if ($connRes && $c = $connRes->fetch_assoc()) {
            $row['active_connections'] = (int)$c['c'];
        }
        $row['size_mb'] = $row['size_mb'] ?? 0;
        $row['active_connections'] = $row['active_connections'] ?? 0;
        echo json_encode($row);
        break;

    // ── Domain Monitoring ──
    case 'monitor_get_domains':
        $result = $conn->query("SELECT md.*, mw.name as website_name FROM monitoring_domains md LEFT JOIN monitoring_websites mw ON md.website_id = mw.id ORDER BY md.expiry_date ASC");
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $row['days_until_expiry'] = (int)$row['days_until_expiry'];
            $row['ssl_days_until_expiry'] = (int)$row['ssl_days_until_expiry'];
            $data[] = $row;
        }
        echo json_encode($data);
        break;

    case 'monitor_add_domain':
        $domain = $conn->real_escape_string($input['domain'] ?? '');
        $website_id = (int)($input['website_id'] ?? 0);
        $registrar = $conn->real_escape_string($input['registrar'] ?? '');
        $expiry = $conn->real_escape_string($input['expiry_date'] ?? '');
        $ssl_expiry = $conn->real_escape_string($input['ssl_expiry_date'] ?? '');
        $days = $expiry ? round((strtotime($expiry) - time()) / 86400) : 0;
        $ssl_days = $ssl_expiry ? round((strtotime($ssl_expiry) - time()) / 86400) : 0;
        $status = $days < 0 ? 'expired' : ($days < 30 ? 'expiring_soon' : 'valid');
        $wid = $website_id > 0 ? $website_id : "NULL";
        $sql = "INSERT INTO monitoring_domains (domain, website_id, registrar, expiry_date, days_until_expiry, ssl_expiry_date, ssl_days_until_expiry, status) VALUES ('$domain', $wid, '$registrar', " . ($expiry ? "'$expiry'" : "NULL") . ", $days, " . ($ssl_expiry ? "'$ssl_expiry'" : "NULL") . ", $ssl_days, '$status')";
        if ($conn->query($sql)) echo json_encode(["success" => true, "id" => $conn->insert_id]);
        else echo json_encode(["error" => $conn->error]);
        break;

    case 'monitor_delete_domain':
        $id = (int)($input['id'] ?? 0);
        $conn->query("DELETE FROM monitoring_domains WHERE id=$id");
        echo json_encode(["success" => true]);
        break;

    // ── API Monitoring ──
    case 'monitor_get_apis':
        $result = $conn->query("SELECT * FROM monitoring_api ORDER BY name");
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $row['response_time_ms'] = (int)$row['response_time_ms'];
            $row['success_count'] = (int)$row['success_count'];
            $row['fail_count'] = (int)$row['fail_count'];
            $data[] = $row;
        }
        echo json_encode($data);
        break;

    case 'monitor_add_api':
        $name = $conn->real_escape_string($input['name'] ?? '');
        $endpoint = $conn->real_escape_string($input['endpoint'] ?? '');
        $method = $conn->real_escape_string($input['method'] ?? 'GET');
        $sql = "INSERT INTO monitoring_api (name, endpoint, method) VALUES ('$name', '$endpoint', '$method')";
        if ($conn->query($sql)) echo json_encode(["success" => true, "id" => $conn->insert_id]);
        else echo json_encode(["error" => $conn->error]);
        break;

    case 'monitor_check_api':
        $id = (int)($input['id'] ?? 0);
        $res = $conn->query("SELECT * FROM monitoring_api WHERE id=$id");
        $api = $res->fetch_assoc();
        if (!$api) { echo json_encode(["error" => "API not found"]); break; }
        $start = microtime(true);
        $ch = curl_init($api['endpoint']);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_SSL_VERIFYPEER => false]);
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        $elapsed = round((microtime(true) - $start) * 1000);
        $success = ($httpCode >= 200 && $httpCode < 500 && empty($err));
        if ($success) $conn->query("UPDATE monitoring_api SET status='active', response_time_ms=$elapsed, success_count=success_count+1, last_checked=NOW() WHERE id=$id");
        else $conn->query("UPDATE monitoring_api SET status='down', response_time_ms=$elapsed, fail_count=fail_count+1, last_checked=NOW() WHERE id=$id");
        echo json_encode(["success" => $success, "response_time_ms" => $elapsed, "http_status" => $httpCode]);
        break;

    case 'monitor_delete_api':
        $id = (int)($input['id'] ?? 0);
        $conn->query("DELETE FROM monitoring_api WHERE id=$id");
        echo json_encode(["success" => true]);
        break;

    // ── Security Logs ──
    case 'monitor_get_security_logs':
        $limit = (int)($input['limit'] ?? $_GET['limit'] ?? 50);
        $result = $conn->query("SELECT * FROM monitoring_security_logs ORDER BY created_at DESC LIMIT $limit");
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $data[] = $row;
        }
        echo json_encode($data);
        break;

    case 'monitor_security_summary':
        $total = 0; $new = 0; $high = 0; $blocked = 0;
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_security_logs");
        if ($r) $total = (int)$r->fetch_assoc()['c'];
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_security_logs WHERE status='new'");
        if ($r) $new = (int)$r->fetch_assoc()['c'];
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_security_logs WHERE severity IN ('high','critical')");
        if ($r) $high = (int)$r->fetch_assoc()['c'];
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_security_logs WHERE type='blocked_ip'");
        if ($r) $blocked = (int)$r->fetch_assoc()['c'];
        echo json_encode(["total" => $total, "new" => $new, "high_severity" => $high, "blocked_ips" => $blocked]);
        break;

    case 'monitor_update_security_status':
        $id = (int)($input['id'] ?? 0);
        $status = $conn->real_escape_string($input['status'] ?? 'reviewed');
        $conn->query("UPDATE monitoring_security_logs SET status='$status' WHERE id=$id");
        echo json_encode(["success" => true]);
        break;

    // ── Notifications ──
    case 'monitor_get_notifications':
        $limit = (int)($input['limit'] ?? $_GET['limit'] ?? 20);
        $type = $conn->real_escape_string($input['type'] ?? '');
        $sql = "SELECT * FROM monitoring_notifications";
        if ($type) $sql .= " WHERE type='$type'";
        $sql .= " ORDER BY created_at DESC LIMIT $limit";
        $result = $conn->query($sql);
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $row['is_read'] = (bool)$row['is_read'];
            $row['sent_wa'] = (bool)$row['sent_wa'];
            $data[] = $row;
        }
        echo json_encode($data);
        break;

    case 'monitor_mark_notification_read':
        $id = (int)($input['id'] ?? 0);
        $conn->query("UPDATE monitoring_notifications SET is_read=1 WHERE id=$id");
        echo json_encode(["success" => true]);
        break;

    case 'monitor_mark_all_read':
        $conn->query("UPDATE monitoring_notifications SET is_read=1 WHERE is_read=0");
        echo json_encode(["success" => true]);
        break;

    case 'monitor_add_notification':
        $type = $conn->real_escape_string($input['type'] ?? 'info');
        $title = $conn->real_escape_string($input['title'] ?? '');
        $message = $conn->real_escape_string($input['message'] ?? '');
        $severity = $conn->real_escape_string($input['severity'] ?? 'info');
        $sent_wa = (int)($input['sent_wa'] ?? 0);
        $sql = "INSERT INTO monitoring_notifications (type, title, message, severity, sent_wa) VALUES ('$type', '$title', '$message', '$severity', $sent_wa)";
        if ($conn->query($sql)) echo json_encode(["success" => true, "id" => $conn->insert_id]);
        else echo json_encode(["error" => $conn->error]);
        break;

    case 'monitor_get_unread_count':
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_notifications WHERE is_read=0");
        $count = $r ? (int)$r->fetch_assoc()['c'] : 0;
        echo json_encode(["unread" => $count]);
        break;

    // ── Categories ──
    case 'monitor_get_categories':
        $result = $conn->query("SELECT * FROM monitoring_categories ORDER BY sort_order");
        $data = [];
        while ($row = $result->fetch_assoc()) $data[] = $row;
        echo json_encode($data);
        break;

    case 'monitor_add_category':
        $name = $conn->real_escape_string($input['name'] ?? '');
        $icon = $conn->real_escape_string($input['icon'] ?? 'Globe');
        $sort = (int)($input['sort_order'] ?? 0);
        $sql = "INSERT INTO monitoring_categories (name, icon, sort_order) VALUES ('$name', '$icon', $sort)";
        if ($conn->query($sql)) echo json_encode(["success" => true, "id" => $conn->insert_id]);
        else echo json_encode(["error" => $conn->error]);
        break;

    case 'monitor_delete_category':
        $id = (int)($input['id'] ?? 0);
        $conn->query("DELETE FROM monitoring_categories WHERE id=$id");
        echo json_encode(["success" => true]);
        break;

    // ── Settings ──
    case 'monitor_get_settings':
        $result = $conn->query("SELECT * FROM monitoring_settings WHERE id=1");
        if ($row = $result->fetch_assoc()) echo json_encode($row);
        else echo json_encode([]);
        break;

    case 'monitor_update_settings':
        $fields = ['check_interval', 'wa_notifications', 'notify_website_down', 'notify_high_resource', 'notify_ssl_expiry', 'notify_domain_expiry'];
        $sets = [];
        foreach ($fields as $f) {
            if (isset($input[$f])) $sets[] = "$f=" . (int)$input[$f];
        }
        if (isset($input['wa_phone'])) $sets[] = "wa_phone='" . $conn->real_escape_string($input['wa_phone']) . "'";
        if (isset($input['wa_group'])) $sets[] = "wa_group='" . $conn->real_escape_string($input['wa_group']) . "'";
        if (!empty($sets)) {
            $conn->query("UPDATE monitoring_settings SET " . implode(',', $sets) . " WHERE id=1");
        }
        echo json_encode(["success" => true]);
        break;

    // ── Dashboard Summary ──
    case 'monitor_dashboard_summary':
        // Websites
        $totalWeb = 0; $onlineWeb = 0; $offlineWeb = 0;
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_websites");
        if ($r) $totalWeb = (int)$r->fetch_assoc()['c'];
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_websites WHERE status='online'");
        if ($r) $onlineWeb = (int)$r->fetch_assoc()['c'];
        $r = $conn->query("SELECT COUNT(*) as c FROM monitoring_websites WHERE status='offline'");
        if ($r) $offlineWeb = (int)$r->fetch_assoc()['c'];

        // Server
        $server = null;
        $sr = $conn->query("SELECT * FROM monitoring_server_status WHERE id=1");
        if ($sr) $server = $sr->fetch_assoc();

        // Visitors
        $visitors = 0;
        $vr = $conn->query("SELECT total_visits FROM visitor_stats WHERE id=1");
        if ($vr) $visitors = (int)$vr->fetch_assoc()['total_visits'];

        // Database
        $dbSize = 0;
        $dr = $conn->query("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as s FROM information_schema.tables WHERE table_schema='$db'");
        if ($dr && $d = $dr->fetch_assoc()) $dbSize = (float)$d['s'];

        // Notifications unread
        $unreadN = 0;
        $nr = $conn->query("SELECT COUNT(*) as c FROM monitoring_notifications WHERE is_read=0");
        if ($nr) $unreadN = (int)$nr->fetch_assoc()['c'];

        // Domains expiring soon
        $domainsExpiring = [];
        $der = $conn->query("SELECT domain, days_until_expiry, ssl_days_until_expiry FROM monitoring_domains WHERE (days_until_expiry BETWEEN 0 AND 30) OR (ssl_days_until_expiry BETWEEN 0 AND 30)");
        if ($der) { while ($d = $der->fetch_assoc()) $domainsExpiring[] = $d; }

        echo json_encode([
            "websites" => ["total" => $totalWeb, "online" => $onlineWeb, "offline" => $offlineWeb],
            "server" => $server,
            "visitors" => $visitors,
            "database_size_mb" => $dbSize,
            "unread_notifications" => $unreadN,
            "domains_expiring" => $domainsExpiring
        ]);
        break;

    default:
        echo json_encode(["error" => "Invalid action: " . $action]);
        break;
}

$conn->close();
?>
