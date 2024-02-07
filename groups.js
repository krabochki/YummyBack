const express = require("express");
const bodyParser = require("body-parser");

const router = express.Router();
const path = require("path");

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
  destination: "groups/",
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });



router.get('/', (req, res) => {
  const selectQuery = "SELECT * FROM `groups`";

  connection.query(selectQuery, (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.post("/", (req, res) => {
  const { name, image } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ error: "Недостаточно данных для добавления группы" });
  }

  const insertQuery =
    "INSERT INTO `groups` (name, image) VALUES (?, ?)";

  connection.query(
    insertQuery,
    [name, image],
    (error, results, fields) => {
      if (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ info: "Группа с таким именем уже существует" });
        }

        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при выполнении запроса к базе данных" });
      } else {
                  const insertedSectionId = results.insertId;

        res.status(201).json({ id: insertedSectionId });
      }
    }
  );
}); 

router.delete('/:groupId', (req, res) => {
  const groupId = req.params.groupId;

  const deleteQuery = "DELETE FROM `groups` WHERE id = ?";

  connection.query(deleteQuery, [groupId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при удалении группы из базы данных" });
    } else {
      res.status(200).json({ message: "Группа успешно удалена" });
    }
  });
});


router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "groups", filename); // Путь к папке, где хранятся файлы

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Если файл не найден, отправляем 404
    res.status(404).send("File not found");
  }
});

router.delete("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "groups", filename);
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

router.put('/:groupsId', (req, res) => {
  const groupsId = Number(req.params.groupsId);
    const {
      name,image
  } = req.body;

  const updateQuery = "UPDATE `groups` SET name = ?, image = ? WHERE id = ?";

  connection.query(updateQuery, [name,image, groupsId], (error, results, fields) => {
    if (error) {
                if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ info: "Группа с таким именем уже существует" });
        }

      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при обновлении секции в базе данных" });
    } else {
      res.status(200).json({ message: "Группа успешно обновлена" });
    }
  });
});


router.get("/ingredients/:groupId", (req, res) => {
  const groupId = req.params.groupId;
  const query = "SELECT ingredientId FROM `groups-ingredients` WHERE groupId = ?";
  connection.query(query, [groupId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      const ingredients = results.map((result) => result.ingredientId) || [];
      res.json(ingredients);
    }
  });
});


router.post("/image", upload.single("image"), (req, res) => {
  const imageFilename = req.file.filename;
  res
    .status(200)
    .json({ message: "Изображение секции успешно загружено", filename: imageFilename });
});



router.get("/some", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery =
  `
    SELECT COUNT(DISTINCT g.id) AS totalCount
    FROM \`groups\` g
    WHERE EXISTS (
      SELECT 1
      FROM \`groups-ingredients\` gi
      WHERE gi.groupId = g.id
    );
  `;

  const selectQuery = `SELECT DISTINCT \`groups\`.id, \`groups\`.name 
                       FROM \`groups\`
                       JOIN \`groups-ingredients\` ON \`groups\`.id = \`groups-ingredients\`.groupId
                       ORDER BY \`groups\`.id LIMIT ${startIndex}, ${limit}`;
  
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
        res.status(200).json({results:results, count:totalCount});
      }
    });
  })
});



router.get("/group/:id", (req, res) => {
  const id = Number(req.params.id);
  const query = "SELECT id,image, name FROM `groups` WHERE id = ?";

  connection.query(query, [id], (error, results, fields) => {
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

router.get("/some-full/:userId", (req, res) => {

  const authorId = Number(req.params.userId) || 0;

  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery =
  `
    SELECT COUNT(DISTINCT g.id) AS totalCount
    FROM \`groups\` g
  `;

  const selectQuery = `
    SELECT g.id, g.name, g.image,
      COUNT(DISTINCT ri.recipeId) AS recipesCount
    FROM \`groups\` g
    LEFT JOIN \`groups-ingredients\` gi ON g.id = gi.groupId
    LEFT JOIN ingredients i ON gi.ingredientId = i.id
    LEFT JOIN \`recipes-ingredients\` ri ON i.name = ri.name OR ri.name IN 
      (SELECT variation FROM \`ingredients-variations\` WHERE ingredientId = i.id)
    LEFT JOIN recipes r ON ri.recipeId = r.id
    WHERE i.status = 'public' AND (r.status = 'public' OR r.authorId = ? OR r.id IS NULL)  OR gi.groupId IS NULL
    GROUP BY g.id
    ORDER BY recipesCount DESC, g.id`;
  
  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
    }

  const totalCount = countResults[0].totalCount;

  connection.query(selectQuery, [authorId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json({results:results, count:totalCount});
      }
    });
  })
});

router.get("/some-ingredients/:groupId/:userId", (req, res) => {
  const groupId = Number(req.params.groupId);
  const userId = Number(req.params.userId);
  const page = req.query.page || 0; // Установите значение по умолчанию на страницу 0, если не указано
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM ingredients i
    INNER JOIN \`groups-ingredients\` gi ON i.id = gi.ingredientId
    WHERE gi.groupId = ? AND i.status = 'public'`;

  const selectQuery = `
    SELECT i.id, i.name, i.image,
      (SELECT COUNT(DISTINCT ri.recipeId)
      FROM \`recipes-ingredients\` ri
      JOIN recipes r ON ri.recipeId = r.id
      WHERE (r.status = 'public' OR r.authorId = ?) 
        AND (ri.name = i.name OR ri.name IN (SELECT variation FROM \`ingredients-variations\` WHERE ingredientId = i.id))) 
      AS recipesCount
    FROM ingredients i
    INNER JOIN \`groups-ingredients\` gi ON i.id = gi.ingredientId
    WHERE i.status = 'public' AND gi.groupId = ?
    ORDER BY recipesCount DESC, i.name
      LIMIT ${startIndex}, ${limit};

    `;

  connection.query(countQuery, [groupId], (error, countResults, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const totalCount = countResults[0].totalCount;

      connection.query(selectQuery, [userId, groupId], (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
        } else {
          res.status(200).json({ results: results, count: totalCount });
        }
      });
    }
  });
});



router.get("/search", (req, res) => {
  const searchText = req.query.search; 

  const selectQuery =
    "SELECT id, name FROM \`groups\` WHERE name LIKE ?";
  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/search-by-group/:groupId", (req, res) => {
    const groupId = Number(req.params.groupId);

  const searchText = req.query.search; 
  const selectQuery =
    `
    SELECT DISTINCT i.id, i.name
    FROM ingredients i
    INNER JOIN \`groups-ingredients\` gi ON i.id = gi.ingredientId
    LEFT JOIN \`ingredients-variations\` iv ON i.id = iv.ingredientId
    WHERE (i.name LIKE ? OR iv.variation LIKE ?) AND gi.groupId = ? AND i.status = 'public'
    `;
  connection.query(selectQuery, [`%${searchText}%`,`%${searchText}%`, groupId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});



module.exports = router;
