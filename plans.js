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

  const query = "SELECT * FROM calendarEvents WHERE userId = ?";

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
  let { name, note, typeId, amount, userId,recipeId } = req.body;

  if (recipeId === 0) {
    recipeId = null
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
    [name, note, typeId, amount, userId,recipeId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res.status(201).json({ message: "Продукт успешно добавлен" });
      }
    }
  );
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
    [new Date(end), new Date(start), color, title, recipeId || null, wholeDay, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res.status(201).json({ message: "Продукт успешно добавлен" });
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
    [new Date(end), new Date(start), color, title, recipeId || null, wholeDay, userId, eventId],
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

  connection.query(deleteQuery, [eventId], (error, results, fields) => {
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
