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
      res
        .status(200)
        .json({
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
      res
        .status(200)
        .json({
          message: `Свойство пользователя успешно обновлено`,
        });
    }
  });
});



router.get('/public', (req, res) => {
  const selectQuery = "SELECT * FROM categories WHERE status = 'awaits'";
  connection.query(selectQuery, (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get('/', (req, res) => {
  const selectQuery = "SELECT * FROM categories WHERE status = 'public'";

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
  const { name, image,sendDate,authorId,sectionId,status } = req.body;

  if (!name || !authorId) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для добавления категории" });
  }

  const insertQuery =
    "INSERT INTO categories (name, image, sendDate, authorId, sectionId, status) VALUES (?, ?, ?,?,?,?)";

  connection.query(
    insertQuery,
    [name, image, new Date(sendDate),authorId, sectionId,status],
    (error, results, fields) => {
      if (error) {
                if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ info: "Категория с таким именем уже существует" });
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

router.delete('/:categoryId', (req, res) => {
  const categoryId = req.params.categoryId;

  const deleteQuery = "DELETE FROM categories WHERE id = ?";

  connection.query(deleteQuery, [categoryId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при удалении секции из базы данных" });
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

router.put('/:categoryId', (req, res) => {
    const categoryId = Number(req.params.categoryId);
    
      const { name, image,sectionId } = req.body;


  const updateQuery = "UPDATE categories SET name = ?, image = ?, sectionId = ? WHERE id = ?";

  connection.query(updateQuery, [name,image, sectionId, categoryId], (error, results, fields) => {
    if (error) {
                      if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ info: "Категория с таким именем уже существует" });
        }
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при обновлении секции в базе данных" });
    } else {
      res.status(200).json({ message: "Секция успешно обновлена" });
    }
  });
});

router.put('/:categoryId/publish', (req, res) => {
  const categoryId = Number(req.params.categoryId);
  
  const updateRoleQuery = "UPDATE categories SET status = 'public' WHERE id = ?";

  connection.query(updateRoleQuery, [categoryId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при обновлении роли категории в базе данных" });
    } else {
      res.status(200).json({ message: "Роль категории успешно обновлена на public" });
    }
  });
});


router.post("/image", upload.single("image"), (req, res) => {
  const imageFilename = req.file.filename;
  res
    .status(200)
    .json({ message: "Изображение секции успешно загружено", filename: imageFilename });
});

module.exports = router;
