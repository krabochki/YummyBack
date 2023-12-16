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

const storage = multer.diskStorage({
  destination: "recipes/", // папка, куда сохранять файлы
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // уникальное имя файла
  },
});

const upload = multer({ storage });


router.get("/image/:path", (req, res) => {
  const path = req.params.path;
  const imagePath = `recipes/${path}`;
  res.sendFile(imagePath, { root: __dirname });
});

router.post("/", upload.single("image"), (req, res) => {
  const { title, description, author } = req.body;

  const imagePath = req.file ? req.file.path : null;

  connection.query(getMaxIdQuery, (maxIdError, maxIdResults) => {
    if (maxIdError) {
      console.error("Ошибка запроса к базе данных:", maxIdError);
      res.status(500).send("Ошибка сервера");
      return;
    }
    const insertQuery =
      "INSERT INTO recipes (id,title, description, image_path,author) VALUES (?,?, ?, ?,?)";
    connection.query(
      insertQuery,
      [newId, title, description, imagePath, author],
      (insertError, insertResults, insertFields) => {
        if (insertError) {
          console.error("Ошибка запроса к базе данных:", insertError);
          res.status(500).send("Ошибка сервера");
        } else {
          res.json({
            id: newId,
            title: title,
            description: description,
            image_path: imagePath,
            author: Number(author),
            status: "private",
          });
        }
      }
    );
  });
});

module.exports = router; 
