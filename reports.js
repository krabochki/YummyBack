const express = require("express");
const router = express.Router();

const corsOptions = {
  origin: true,
  credentials: true,
};

const cors = require("cors");
const bodyParser = require("body-parser");
const connection = require("./db");

router.use(cors(corsOptions));
router.use(bodyParser.json());

router.post("/", (req, res) => {
  let { commentId, reporterId } = req.body;

  if (!reporterId || !commentId) {
    return res.status(400).json({ info: "Недостаточно данных для добавления" });
  }

  const checkIfExistsQuery = `SELECT * FROM \`comments-reports\` 
    WHERE reporterId = ? AND commentId = ?`;

  connection.query(
    checkIfExistsQuery,
    [reporterId, commentId],
    (checkError, checkResults, checkFields) => {
      if (checkError) {
        console.error("Ошибка при выполнении запроса проверки:", checkError);
        return res.status(500).json({
          info: "Ошибка при выполнении запроса проверки в базе данных",
        });
      }

      if (checkResults.length > 0) {
        return res.status(409).json({
          info: "Запись уже существует",
        });
      }

      const insertQuery = `INSERT INTO \`comments-reports\` 
        (reporterId, commentId)
        VALUES (?, ?)`;

      connection.query(
        insertQuery,
        [reporterId, commentId],
        (insertError, insertResults, insertFields) => {
          if (insertError) {
            console.error("Ошибка при выполнении запроса:", insertError);
            return res.status(500).json({
              info: "Ошибка при выполнении запроса к базе данных",
            });
          }

          res.status(201).json({});
        }
      );
    }
  );
});


router.delete("/:reportId", (req, res) => {
  const reportId = req.params.reportId;

  const deleteQuery = "DELETE FROM `comments-reports` WHERE id = ?";

  connection.query(deleteQuery, [reportId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при удалении жалобы из базы данных" });
    } else {
      res.status(200).json({ message: "Жалоба успешно удалена" });
    }
  });
});



router.get("/count/:userId", (req, res) => {
  const userId = Number(req.params.userId);

  const query = `
  SELECT COUNT(*) AS count
  FROM \`comments-reports\` 
  WHERE reporterId != ${userId}
  AND commentId NOT IN (
    SELECT comments.id
    FROM comments 
    JOIN \`comments-reports\` ON \`comments-reports\`.id = \`comments-reports\`.commentId
    WHERE comments.authorId != ${userId})
  `;

  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error(error);
      res
        .status(500)
        .json({
          error: "Ошибка при попытке получить количество ожидающих обновлений",
        });
    } else {
      res.status(200).json(results);
    }
  });
});


router.get("/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
  
  SELECT COUNT(*) AS totalCount
  FROM \`comments-reports\` 
  WHERE reporterId != ${userId}
  AND commentId NOT IN (
    SELECT comments.id
    FROM comments 
    JOIN \`comments-reports\` ON \`comments-reports\`.id = \`comments-reports\`.commentId
    WHERE comments.authorId != ${userId})`;

  const selectQuery = `
    SELECT cr.commentId, cr.reporterId, cr.id, c.recipeId  FROM \`comments-reports\` cr
    JOIN comments c ON cr.commentId = c.id
    WHERE reporterId != ${userId}
    AND 
      commentId NOT IN (
      SELECT comments.id
      FROM comments 
      JOIN \`comments-reports\` ON \`comments-reports\`.id = \`comments-reports\`.commentId
      WHERE comments.authorId != ${userId})
    LIMIT ${startIndex}, ${limit}
  `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json({ reports: results, count: totalCount });
      }
    });
  });
});

module.exports = router;
