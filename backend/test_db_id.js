import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASS || 'garuda2024',
  database: process.env.MYSQL_DB || 'db_garudanexabahtera',
});
try {
  const [rows] = await pool.query('SELECT id, title FROM list_products');
  console.log('Database IDs:', rows);
} catch (e) {
  console.error(e);
}
process.exit(0);
