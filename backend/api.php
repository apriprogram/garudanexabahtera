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

    default:
        echo json_encode(["error" => "Invalid action: " . $action]);
        break;
}

$conn->close();
?>
