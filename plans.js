const express = require("express");
const bodyParser = require("body-parser");

const router = express.Router();

const cors = require("cors");

const corsOptions = {
  origin: true,
  credentials: true,
};
const connection = require("./db");

router.use(cors(corsOptions));
router.use(bodyParser.json());

router.get("/products/:userId", (req, res) => {
  const userId = req.params.userId;

  const query = "SELECT * FROM products WHERE userId = ?";

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/events/:userId", (req, res) => {
  const userId = req.params.userId;

  const query =
    "SELECT * FROM calendarEvents WHERE userId = ? ORDER by start DESC, end DESC, title";

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/today-upcoming-reminder/:userId", (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT id
    FROM notifications
    WHERE DATE(sendDate) = CURDATE() AND context = 'plan-reminder' AND userId=?
  `;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      if (results.length > 0) {
        res.status(200).json({ hasRows: true });
      } else {
        res.status(200).json({ hasRows: false });
      }
    }
  });
});

// DELETE n
// FROM notifications n
// JOIN calendarEvents ce ON n.relatedId = ce.id
// WHERE n.userId = 8
//     AND n.context = 'plan-reminder-start'
//     AND ce.userId = 8
//     AND DATE(ce.end) < CURDATE();

router.delete("/old-started-reminders/:userId", (req, res) => {
  const userId = req.params.userId;

  const query = `
    DELETE n
    FROM notifications n
    JOIN calendarEvents ce ON n.relatedId = ce.id
    WHERE n.userId = ?
      AND n.context = 'plan-reminder-start'
      AND ce.userId = ?
      AND DATE(ce.end) < CURDATE();
  `;

  connection.query(query, [userId, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({ message: "Успешно" });
    }
  });
});

router.get("/started-events/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT id, title,start 
    FROM calendarEvents 
    WHERE userId = 8 
      AND start < now() 
      AND end > now() 
      AND id NOT IN 
        (SELECT relatedId 
         FROM notifications 
         WHERE context = 'plan-reminder-start')
  `;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.delete("/old-upcoming-reminders/:userId", (req, res) => {
  const userId = req.params.userId;

  const query = `
    delete FROM notifications
WHERE date(STR_TO_DATE(sendDate, '%Y-%m-%dT%H:%i:%s.%fZ')) < CURDATE() AND context = 'plan-reminder' and userId = ?
  `;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({ message: "Успешно" });
    }
  });
});

router.get("/upcoming-events/:userId", (req, res) => {
  const userId = req.params.userId;

  const query = `
    SELECT id, title,start
    FROM calendarEvents 
WHERE userId = ? AND start > NOW() AND start <= DATE_ADD(NOW(), INTERVAL 3 DAY)
    ORDER by start DESC, end DESC
  `;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.put("/products/:productId/mark-bought", (req, res) => {
  const productId = req.params.productId;
  const { bought } = req.body;

  if (bought !== undefined) {
    const updateQuery = "UPDATE products SET bought = ? WHERE id = ?";

    connection.query(
      updateQuery,
      [bought, productId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при выполнении запроса к базе данных" });
        } else {
          res
            .status(200)
            .json({ message: "Статус покупки продукта успешно обновлен" });
        }
      }
    );
  } else {
    res.status(400).json({ error: "Неверное значение для статуса покупки" });
  }
});

router.put("/events/:eventId/change-date", (req, res) => {
  const eventId = req.params.eventId;
  const { start, end } = req.body;

  if (start !== undefined) {
    const updateQuery =
      "UPDATE calendarEvents SET start = ?, end = ? WHERE id = ?";

    connection.query(
      updateQuery,
      [new Date(start), new Date(end), eventId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при выполнении запроса к базе данных" });
        } else {
          res
            .status(200)
            .json({ message: "Статус покупки продукта успешно обновлен" });
        }
      }
    );
  } else {
    res.status(400).json({ error: "Неверное значение для статуса покупки" });
  }
});

router.post("/products", (req, res) => {
  let { name, note, typeId, amount, userId, recipeId } = req.body;

  if (recipeId === 0) {
    recipeId = null;
  }
  if (!name || !userId) {
    return res
      .status(400)
      .json({ error: "Недостаточно данных для добавления продукта" });
  }

  const insertQuery =
    "INSERT INTO products (name, note, typeId, amount, userId,recipeId) VALUES (?, ?, ?, ?, ?,?)";

  connection.query(
    insertQuery,
    [name, note, typeId, amount, userId, recipeId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res.status(201).json({ id: results.insertId,  message: "Продукт успешно добавлен" });
      }
    }
  );
});

router.get("/related-ingredients-by-product/:productId", (req, res) => {
  const productId = req.params.productId;
  const selectQuery = `
    SELECT 
    productId, ingredientId
FROM (
    SELECT 
        p.id as productId,
        COALESCE(i.id, iv.ingredientId) AS ingredientId,
        ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY p.id) AS rn
    FROM 
        products p
    LEFT JOIN 
        ingredients i ON p.name LIKE CONCAT('%',i.name,'%')  AND i.status = 'public'
    LEFT JOIN 
        \`ingredients-variations\` iv ON p.name LIKE CONCAT('%', iv.variation, '%')
    WHERE 
        p.id =  ? 
) AS subquery where rn=1 and ingredientId`;

  connection.query(selectQuery, [productId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/related-ingredients/:userId", (req, res) => {
  const userId = req.params.userId;
  const selectQuery = `
 WITH ingredient_lengths AS (
    SELECT 
        p.id as productId,
        COALESCE(i.id, iv.ingredientId) AS ingredientId,
        COALESCE(i.name, iv.variation) AS ingredient_name,
        LENGTH(COALESCE(i.name, iv.variation)) AS name_length,
        ROW_NUMBER() OVER (PARTITION BY p.id  ORDER BY LENGTH(COALESCE(i.name, iv.variation)) DESC) AS rn
    FROM 
        products p
    LEFT JOIN 
        ingredients i ON p.name LIKE CONCAT('%',i.name,'%')  AND i.status = 'public'
    LEFT JOIN 
        \`ingredients-variations\` iv ON p.name LIKE CONCAT('%', iv.variation, '%')
    WHERE 
        p.userId = ? and p.recipeId is null
)
SELECT 
    productId,
    ingredientId
FROM 
    ingredient_lengths
WHERE 
    rn = 1;

  `;

  connection.query(selectQuery, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.post("/events", (req, res) => {
  const { end, start, color, title, recipeId, wholeDay, userId } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ error: "Недостаточно данных для добавления" });
  }

  const insertQuery =
    "INSERT INTO calendarEvents (end, start, color, title, recipeId, wholeDay, userId) VALUES (?, ?, ?, ?, ?,?,?)";

  connection.query(
    insertQuery,
    [
      new Date(end),
      new Date(start),
      color,
      title,
      recipeId || null,
      wholeDay,
      userId,
    ],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res
          .status(201)
          .json({ message: "Продукт успешно добавлен", id: results.insertId });
      }
    }
  );
});

router.put("/events/:eventId", (req, res) => {
  const eventId = req.params.eventId;
  const { end, start, color, title, recipeId, wholeDay, userId } = req.body;

  if (!userId || !eventId) {
    return res
      .status(400)
      .json({ error: "Недостаточно данных для обновления" });
  }

  const updateQuery =
    "UPDATE calendarEvents SET end = ?, start = ?, color = ?, title = ?, recipeId = ?, wholeDay = ?, userId = ? WHERE id = ?";

  connection.query(
    updateQuery,
    [
      new Date(end),
      new Date(start),
      color,
      title,
      recipeId || null,
      wholeDay,
      userId,
      eventId,
    ],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res.status(200).json({ message: "Событие успешно обновлено" });
      }
    }
  );
});

router.delete("/products/:productId", (req, res) => {
  const productId = req.params.productId;

  const deleteQuery = "DELETE FROM products WHERE id = ?";

  connection.query(deleteQuery, [productId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({ message: "Продукт успешно удален" });
    }
  });
});

router.delete("/events/:eventId", (req, res) => {
  const eventId = req.params.eventId;

  const deleteQuery = "DELETE FROM calendarEvents WHERE id = ?";
  const deleteRelatedQuery = `DELETE FROM notifications 
  WHERE relatedId = ?
  AND context = 'plan-reminder-start'
  AND userId = (SELECT userId FROM calendarEvents WHERE id = ?)`;

  connection.beginTransaction(function (err) {
    if (err) {
      throw err;
    }

    connection.query(
      deleteRelatedQuery,
      [eventId, eventId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          return connection.rollback(function () {
            res
              .status(500)
              .json({ error: "Ошибка при выполнении запроса к базе данных" });
          });
        }

        connection.query(
          deleteQuery,
          [eventId],
          (relatedError, relatedResults) => {
            if (relatedError) {
              console.error("Ошибка при удалении данных:", relatedError);
              return connection.rollback(function () {
                res.status(500).json({ error: "Ошибка при удалении данных" });
              });
            }

            connection.commit(function (commitError) {
              if (commitError) {
                console.error("Ошибка при коммите транзакции:", commitError);
                return connection.rollback(function () {
                  res
                    .status(500)
                    .json({ error: "Ошибка при коммите транзакции" });
                });
              }

              res.status(200).json({ message: "Событие успешно удалено" });
            });
          }
        );
      }
    );
  });
});

router.delete("/products/user/:userId", (req, res) => {
  const userId = req.params.userId;

  const deleteAllQuery = "DELETE FROM products WHERE userId = ?";

  connection.query(deleteAllQuery, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res
        .status(200)
        .json({ message: "Все продукты пользователя успешно удалены" });
    }
  });
});

router.put("/products/:productId/update-type", (req, res) => {
  const productId = req.params.productId;
  const { typeId } = req.body;

  if (typeId !== undefined) {
    const updateTypeQuery = "UPDATE products SET typeId = ? WHERE id = ?";

    connection.query(
      updateTypeQuery,
      [typeId, productId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при выполнении запроса к базе данных" });
        } else {
          res.status(200).json({ message: "Тип продукта успешно обновлен" });
        }
      }
    );
  } else {
    res
      .status(400)
      .json({ error: "Недостаточно данных для обновления типа продукта" });
  }
});

module.exports = router;
