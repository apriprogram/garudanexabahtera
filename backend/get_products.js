import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  user: 'root',
  password: '***REMOVED***',
  database: 'db_garudanexabahtera'
});
const [rows] = await pool.query('SELECT * FROM list_products');
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
