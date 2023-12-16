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
  const groupId = req.params.sectionId;
  const query = "SELECT ingredientId FROM `groups-ingredients` WHERE groupId = ?";
  connection.query(query, [groupId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      const ingredients = results.map((result) => result.id);
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

module.exports = router;
