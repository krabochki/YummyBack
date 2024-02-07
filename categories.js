const express = require("express");
const bodyParser = require("body-parser");

const router = express.Router();
const path = require("path");

const POPULAR_CATEGORIES_LENGTH = 30;

const cors = require("cors");

const corsOptions = {
  origin: true,
  credentials: true,
};
const connection = require("./db");

router.use(cors(corsOptions));
router.use(bodyParser.json());

const multer = require("multer");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: "categories/",
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.put("/set-section/:categoryId", (req, res) => {
  const categoryId = req.params.categoryId;
  const sectionId = req.body.id;

  const query = `UPDATE categories SET sectionId = ? WHERE id = ?`;

  connection.query(query, [sectionId, categoryId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({
        message: `Свойство пользователя успешно обновлено`,
      });
    }
  });
});

router.put("/unset-section/:categoryId", (req, res) => {
  const categoryId = req.params.categoryId;
  const sectionId = req.body.id;

  const query = `UPDATE categories SET sectionId = ? WHERE id = ?`;

  connection.query(query, [null, categoryId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({
        message: `Свойство пользователя успешно обновлено`,
      });
    }
  });
});

router.get("/awaits-count", (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM categories  WHERE status = 'awaits'`;
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

router.get("/by-section/:sectionId", (req, res) => {
  const sectionId = Number(req.params.sectionId);

const selectQuery = `
  SELECT c.*, COUNT(DISTINCT rc.recipeId) AS recipeCount
  FROM categories c
  LEFT JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
  WHERE c.status = 'public' AND c.sectionId = ? 
  GROUP BY c.id, c.name
  ORDER BY recipeCount DESC, c.name
  LIMIT 8
`;


  connection.query(selectQuery, [sectionId], (error, results, fields) => {
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


router.get("/by-section/short/:sectionId", (req, res) => {
  const sectionId = Number(req.params.sectionId);

  const selectQuery =
    "SELECT id, name FROM categories WHERE status = 'public' AND sectionId = ?";

  connection.query(selectQuery, [sectionId], (error, results, fields) => {
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



router.get("/category/:categoryId", (req, res) => {
  const categoryId = Number(req.params.categoryId);
  const selectQuery =
    "SELECT * FROM categories WHERE status = 'public' AND id = ?";

  connection.query(selectQuery, [categoryId], (error, results, fields) => {
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

router.get("/by-recipe/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);
  const selectQuery =
    `
    SELECT c.name, c.id FROM categories c
    JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
    WHERE rc.recipeId = ? AND c.status = 'public'
  `;

  connection.query(selectQuery, [recipeId], (error, results, fields) => {
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


router.get("/popular/search", (req, res) => {
  const searchText = req.query.search;
  const limit = POPULAR_CATEGORIES_LENGTH; // Ограничиваем результаты до 30 популярных категорий
  const selectQuery = `
    SELECT c.id, c.name
    FROM categories c
    LEFT JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
    WHERE c.status = 'public' AND c.name LIKE ?
    AND c.id IN (
      SELECT id
      FROM (
        SELECT c.id, ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT rc.recipeId) DESC, c.id) AS row_num
        FROM categories c
        LEFT JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
        GROUP BY c.id, c.name
      ) ranked
      WHERE row_num <= ${limit}
    )
    GROUP BY c.id, c.name
    ORDER BY COUNT(DISTINCT rc.recipeId) DESC, c.id;
  `;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});







router.get("/section/search/:sectionId", (req, res) => {
  const searchText = req.query.search; 
  const sectionId = Number(req.params.sectionId); 
  const selectQuery =
    "SELECT id,name FROM categories WHERE status = 'public' AND name LIKE ? AND sectionId = ?";

  connection.query(selectQuery, [`%${searchText}%`,sectionId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});



router.get('/popular/:userId', (req, res) => {

//     SELECT c.*, COUNT(DISTINCT CASE WHEN (r.status = 'public' OR r.authorId = ${userId})  THEN rc.recipeId END) AS recipeCount
// FROM categories c
// LEFT JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
// LEFT JOIN recipes r ON rc.recipeId = r.id AND (r.status = 'public' OR r.authorId = ${userId})
// WHERE c.sectionId = ?
// GROUP BY c.id, c.name
// ORDER BY recipeCount DESC, c.id
//   LIMIT ${startIndex}, ${limit}

  const userId = Number(req.params.userId)

  const popularCategoriesQuery = `
  SELECT c.id, c.name, c.image, COUNT(DISTINCT CASE WHEN (r.status = 'public' OR r.authorId = ${userId}) THEN rc.recipeId END) AS recipeCount
  FROM categories c
  LEFT JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
  LEFT JOIN recipes r ON rc.recipeId = r.id AND (r.status = 'public' OR r.authorId = ${userId})
  GROUP BY c.id, c.name
  ORDER BY recipeCount DESC
  LIMIT 8`;

  connection.query(popularCategoriesQuery, (error, results, fields) => {
    if (error) {
      console.error('Ошибка при выполнении запроса:', error);
      res.status(500).json({ error: 'Ошибка при получении данных из базы данных' });
    } else {
      res.status(200).json( results );
    }
  });
});




router.get("/groups/search", (req, res) => {
  const searchText = req.query.search; 
  const selectQuery =
    "SELECT id,name, sectionId FROM categories WHERE status = 'public' AND name LIKE ?";

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});





router.get("/section/search/:sectionId", (req, res) => {
  const searchText = req.query.search; 
  const sectionId = Number(req.params.sectionId); 
  const selectQuery =
    "SELECT id,name FROM categories WHERE status = 'public' AND name LIKE ? AND sectionId = ?";

  connection.query(selectQuery, [`%${searchText}%`,sectionId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});


router.get("/some/popular", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const maxTotalResults = POPULAR_CATEGORIES_LENGTH; // Максимальное общее количество категорий

  // Установим максимальное значение limit равным maxTotalResults, если limit больше
  const adjustedLimit = Math.min(limit, maxTotalResults);

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
      SELECT c.id
      FROM categories c
      LEFT JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
      GROUP BY c.id
      LIMIT ${adjustedLimit} OFFSET ${startIndex}
    ) AS subquery;
  `;

  const selectQuery = `
    SELECT c.*, COUNT(DISTINCT rc.recipeId) AS recipeCount
    FROM categories c
    LEFT JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
    GROUP BY c.id, c.name
    ORDER BY recipeCount DESC, c.id
    LIMIT ${startIndex}, ${adjustedLimit};
  `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json({ categories: results, count: totalCount });
      }
    });
  });
});



router.get("/some-section/:sectionId/:userId", (req, res) => {
  const sectionId = Number(req.params.sectionId);

  const page = req.query.page;
  const limit = req.query.limit || 2;
  const userId = Number(req.params.userId)


  const startIndex = page * limit;

  let countQuery = `SELECT COUNT(*) AS totalCount FROM categories WHERE sectionId = ? AND status = 'public'  `;

const selectQuery = `
  SELECT c.*, COUNT(DISTINCT CASE WHEN (r.status = 'public' OR r.authorId = ${userId})  THEN rc.recipeId END) AS recipeCount
FROM categories c
LEFT JOIN \`recipes-categories\` rc ON c.id = rc.categoryId
LEFT JOIN recipes r ON rc.recipeId = r.id AND (r.status = 'public' OR r.authorId = ${userId})
WHERE c.sectionId = ? AND c.status = 'public'
GROUP BY c.id, c.name
ORDER BY recipeCount DESC, c.id
  LIMIT ${startIndex}, ${limit}
`;


  connection.query(countQuery, [sectionId], (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, [sectionId], (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json({ categories: results, count: totalCount });
      }
    });
  });
});

router.post("/", (req, res) => {
  const { name, image, sendDate, authorId, sectionId, status } = req.body;

  if (!name || !authorId) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для добавления категории" });
  }

  const insertQuery =
    "INSERT INTO categories (name, image, sendDate, authorId, sectionId, status) VALUES (?, ?, ?,?,?,?)";

  connection.query(
    insertQuery,
    [name, image, new Date(sendDate), authorId, sectionId, status],
    (error, results, fields) => {
      if (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ info: "Категория с таким именем уже существует" });
        }

        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ info: "Ошибка при выполнении запроса к базе данных" });
      } else {
        const insertedSectionId = results.insertId;

        res.status(201).json({ id: insertedSectionId });
      }
    }
  );
});

router.delete("/:categoryId", (req, res) => {
  const categoryId = req.params.categoryId;

  const deleteQuery = "DELETE FROM categories WHERE id = ?";

  connection.query(deleteQuery, [categoryId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при удалении секции из базы данных" });
    } else {
      res.status(200).json({ message: "Секция успешно удалена" });
    }
  });
});

router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "categories", filename); // Путь к папке, где хранятся файлы

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Если файл не найден, отправляем 404
    res.status(404).send("File not found");
  }
});

router.delete("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "categories", filename);
  if (filePath)
    try {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          res.status(200).json({ message: "File deleted successfully" });
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
});

router.put("/:categoryId", (req, res) => {
  const categoryId = Number(req.params.categoryId);

  const { name, image, sectionId } = req.body;

  const updateQuery =
    "UPDATE categories SET name = ?, image = ?, sectionId = ? WHERE id = ?";

  connection.query(
    updateQuery,
    [name, image, sectionId, categoryId],
    (error, results, fields) => {
      if (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ info: "Категория с таким именем уже существует" });
        }
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при обновлении секции в базе данных" });
      } else {
        res.status(200).json({ message: "Секция успешно обновлена" });
      }
    }
  );
});

router.put("/:categoryId/publish", (req, res) => {
  const categoryId = Number(req.params.categoryId);

  const updateRoleQuery =
    "UPDATE categories SET status = 'public' WHERE id = ?";

  connection.query(updateRoleQuery, [categoryId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при обновлении роли категории в базе данных" });
    } else {
      res
        .status(200)
        .json({ message: "Роль категории успешно обновлена на public" });
    }
  });
});

router.get("/public", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;

  const startIndex = page * limit;

  let countQuery = `SELECT COUNT(*) AS totalCount FROM categories WHERE status = 'awaits'`;

  const selectQuery = `SELECT * FROM categories WHERE status = 'awaits' ORDER BY sendDate DESC LIMIT ${startIndex}, ${limit}`;

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
        res.status(200).json({ results: results, count: totalCount });
      }
    });
  });
});

router.post("/image", upload.single("image"), (req, res) => {
  const imageFilename = req.file.filename;
  res
    .status(200)
    .json({
      message: "Изображение секции успешно загружено",
      filename: imageFilename,
    });
});

module.exports = router;
