// db.js
const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "polinka201606",
  database: "yummy",
});

connection.connect((err) => {
  
});

module.exports = connection;
