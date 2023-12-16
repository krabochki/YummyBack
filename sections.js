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
  destination: "sections/",
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });



router.get('/', (req, res) => {
  const selectQuery = "SELECT * FROM sections";

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
      .json({ error: "Недостаточно данных для добавления секции" });
  }

  const insertQuery =
    "INSERT INTO sections (name, image) VALUES (?, ?)";

  connection.query(
    insertQuery,
    [name, image],
    (error, results, fields) => {
      if (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ info: "Категория с таким именем уже существует" });
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

router.delete('/:sectionId', (req, res) => {
  const sectionId = req.params.sectionId;

  const deleteQuery = "DELETE FROM sections WHERE id = ?";

  connection.query(deleteQuery, [sectionId], (error, results, fields) => {
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
  const filePath = path.join(__dirname, "sections", filename); // Путь к папке, где хранятся файлы

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Если файл не найден, отправляем 404
    res.status(404).send("File not found");
  }
});

router.delete("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "sections", filename);
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

router.put('/:sectionId', (req, res) => {
  const sectionId = Number(req.params.sectionId);
    const {
      name,image
  } = req.body;

  const updateQuery = "UPDATE sections SET name = ?, image = ? WHERE id = ?";

  connection.query(updateQuery, [name,image, sectionId], (error, results, fields) => {
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


router.get("/categories/:sectionId", (req, res) => {
  const sectionId = req.params.sectionId;
  const query = "SELECT id FROM categories WHERE sectionId = ?";
  connection.query(query, [sectionId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      const categories = results.map((result) => result.id);
      res.json(categories);
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
