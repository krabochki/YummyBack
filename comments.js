const express = require("express");
const router = express.Router();

const corsOptions = {
  origin: true,
  credentials: true,
};

const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const connection = require("./db");
const path = require("path");

router.use(cors(corsOptions));
router.use(bodyParser.json());

router.get("/dislike/:commentId", (req, res) => {
  const recipeId = req.params.commentId;

  const selectQuery = `
    SELECT userId
    FROM \`comments-dislikes\`
    WHERE commentId = ?;
  `;

  connection.query(selectQuery, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const userIds = results.map((result) => result.userId);
      res.status(200).json(userIds);
    }
  });
});

router.get("/:recipeId", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const recipeId = req.params.recipeId;

  const countQuery = `SELECT COUNT(*) AS totalCount FROM comments WHERE recipeId = ${recipeId}`;
  const selectQuery = `
  SELECT id, sendDate as date, authorId, content as text
  FROM comments
  WHERE recipeId = ${recipeId}
   ORDER BY date desc
  LIMIT ${startIndex}, ${limit};
  `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      return res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        return res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        return res.status(200).json({ comments: results, count: totalCount });
      }
    });
  });

});

router.get("/short-comment/:commentId", (req, res) => {
  const commentId = req.params.commentId;

  const selectQuery = `
  SELECT id, authorId, content as text
  FROM comments
  WHERE id = ?`;

    connection.query(selectQuery,[commentId], (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        return res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        return res.status(200).json(results[0]);
      }
    });

});


router.get("/like/:commentId", (req, res) => {
  const recipeId = req.params.commentId;

  const selectQuery = `
    SELECT userId
    FROM \`comments-likes\`
    WHERE commentId = ?;
  `;

  connection.query(selectQuery, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const userIds = results.map((result) => result.userId);
      res.status(200).json(userIds);
    }
  });
});

router.post("/", (req, res) => {
  let { text, recipeId, date, authorId } = req.body;

  date = new Date(date);

  if (!authorId || !text || !date || !recipeId) {
    return res.status(400).json({ info: "Недостаточно данных для добавления" });
  }

  const insertQuery = `INSERT INTO comments (
    content,authorId,sendDate,recipeId)
    VALUES
    (?,?,?,?)`;

  connection.query(
    insertQuery,
    [text, authorId, date, recipeId],
    (error, results, fields) => {
      if (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ info: "Рецепт с таким именем уже существует" });
        }
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ info: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res.status(201).json({});
      }
    }
  );
});




router.post("/dislike", (req, res) => {
  const { commentId, userId } = req.body;

  if (!commentId || !userId) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для добавления лайка" });
  }

  const checkLikeQuery = `
    SELECT * FROM \`comments-dislikes\`
    WHERE commentId = ? AND userId = ?
  `;

  const insertLikeQuery = `
    INSERT INTO \`comments-dislikes\` (commentId, userId)
    VALUES (?, ?)
  `;

  connection.query(checkLikeQuery, [commentId, userId], (error, results) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ info: "Ошибка при выполнении запроса к базе данных" });
    } else {
      if (results.length > 0) {
        // Like already exists
        res.status(409).json({ info: "Дизлайк уже добавлен" });
      } else {
        // Like doesn't exist, proceed with the insertion
        connection.query(
          insertLikeQuery,
          [commentId, userId],
          (insertError, insertResults) => {
            if (insertError) {
              console.error("Ошибка при выполнении запроса:", insertError);
              res
                .status(500)
                .json({ info: "Ошибка при выполнении запроса к базе данных" });
            } else {
              res.status(201).json({ info: "Лайк успешно добавлен" });
            }
          }
        );
      }
    }
  });
});

router.delete('/comment/:commentId', (req, res) => {
  const commentId = req.params.commentId;
  const deleteQuery = "DELETE FROM comments WHERE id = ?";

  connection.query(deleteQuery, [commentId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при удалении из базы данных" });
    } else {
      res.status(200).json({ message: "Комментарий успешно удален" });
    }
  });
});


router.delete("/dislike/:userId/:commentId", (req, res) => {
  const userId = req.params.userId;
  const commentId = req.params.commentId;

  if (!commentId || !userId) {
    return res.status(400).json({ info: "Недостаточно данных" });
  }

  const query = `
    DELETE FROM \`comments-dislikes\`
    WHERE commentId = ? AND userId = ?
  `;

  connection.query(query, [commentId, userId], (error, results) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при удалении из базы данных" });
    } else {
      res.status(200).json({ message: "Комментарий успешно удален" });
    }
  });
});

router.post("/like", (req, res) => {
  const { commentId, userId } = req.body;

  if (!commentId || !userId) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для добавления лайка" });
  }

  const checkLikeQuery = `
    SELECT * FROM \`comments-likes\`
    WHERE commentId = ? AND userId = ?
  `;

  const insertLikeQuery = `
    INSERT INTO \`comments-likes\` (commentId, userId)
    VALUES (?, ?)
  `;

  connection.query(checkLikeQuery, [commentId, userId], (error, results) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ info: "Ошибка при выполнении запроса к базе данных" });
    } else {
      if (results.length > 0) {
        // Like already exists
        res.status(409).json({ info: "Лайк уже добавлен" });
      } else {
        // Like doesn't exist, proceed with the insertion
        connection.query(
          insertLikeQuery,
          [commentId, userId],
          (insertError, insertResults) => {
            if (insertError) {
              console.error("Ошибка при выполнении запроса:", insertError);
              res
                .status(500)
                .json({ info: "Ошибка при выполнении запроса к базе данных" });
            } else {
              res.status(201).json({ info: "Лайк успешно добавлен" });
            }
          }
        );
      }
    }
  });
});

router.delete("/like/:userId/:commentId", (req, res) => {
  const userId = req.params.userId;
  const commentId = req.params.commentId;

  if (!commentId || !userId) {
    return res.status(400).json({ info: "Недостаточно данных" });
  }

  const query = `
    DELETE FROM \`comments-likes\`
    WHERE commentId = ? AND userId = ?
  `;

  connection.query(query, [commentId, userId], (error, results) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при удалении из базы данных" });
    } else {
      res.status(200).json({ message: "Комментарий успешно удален" });
    }
  });
});

module.exports = router;
