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
  destination: "ingredients/",
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.put("/set-group/:ingredientId", (req, res) => {
  const ingredientId = req.params.ingredientId;
  const groupId = req.body.id;

  const query =
    "INSERT INTO `groups-ingredients` (groupId, ingredientId) VALUES (?,?)";

  connection.query(query, [groupId, ingredientId], (error, results, fields) => {
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

router.put("/unset-group/:ingredientId", (req, res) => {
  const ingredientId = req.params.ingredientId;
  const groupId = req.body.id;

  const query =
    "DELETE FROM `groups-ingredients` WHERE groupId = ? AND ingredientId = ?;";

  connection.query(query, [groupId, ingredientId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({
        message: `Группа успешно удалена из групп ингредиента`,
      });
    }
  });
});

router.get("/public", (req, res) => {
  const selectQuery = "SELECT * FROM ingredients WHERE status = 'awaits'";
  connection.query(selectQuery, (error, results, fields) => {
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

router.get("/", (req, res) => {
  const selectQuery = "SELECT * FROM ingredients WHERE status = 'public'";

  connection.query(selectQuery, (error, results, fields) => {
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

router.post("/", (req, res) => {
  let {
    name,
    image,
    sendDate,
    author,
    description,
    variations,
    advantages,
    disadvantages,
    origin,
    precautions,
    tips,
    recommendations,
    contraindicates,
    compatibleDishes,
    cookingMethods,
    storageMethods,
    externalLinks,
    shoppingListGroup,
    status,
  } = req.body;

  variations = JSON.stringify(variations);
  advantages = JSON.stringify(advantages);
  disadvantages = JSON.stringify(disadvantages);
  recommendations = JSON.stringify(recommendations);
  contraindicates = JSON.stringify(contraindicates);
  cookingMethods = JSON.stringify(cookingMethods);
  compatibleDishes = JSON.stringify(compatibleDishes);
  storageMethods = JSON.stringify(storageMethods);
  externalLinks = JSON.stringify(externalLinks);
  precautions = JSON.stringify(precautions);
  tips = JSON.stringify(tips);

  if (!name || !author) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для добавления ингредиента" });
  }

  const insertQuery =
    "INSERT INTO ingredients (name, image, sendDate, author, description, variations, advantages, disadvantages, origin, precautions, tips, recommendations, contraindicates, compatibleDishes, cookingMethods, storageMethods, externalLinks, shoppingListGroup, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  connection.query(
    insertQuery,
    [
      name,
      image,
      new Date(sendDate),
      author,
      description,
      variations,
      advantages,
      disadvantages,
      origin,
      precautions,
      tips,
      recommendations,
      contraindicates,
      compatibleDishes,
      cookingMethods,
      storageMethods,
      externalLinks,
      shoppingListGroup,
      status,
    ],
    (error, results, fields) => {
      if (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ info: "Ингредиент с таким именем уже существует" });
        }

        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ info: "Ошибка при выполнении запроса к базе данных" });
      } else {
        const insertedIngredientId = results.insertId;

        res.status(201).json({ id: insertedIngredientId });
      }
    }
  );
});

router.delete("/:ingredientId", (req, res) => {
  const ingredientId = req.params.ingredientId;

  const deleteQuery = "DELETE FROM ingredients WHERE id = ?";

  connection.query(deleteQuery, [ingredientId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при удалении ингредиента из базы данных" });
    } else {
      res.status(200).json({ message: "Ингредиент успешно удален" });
    }
  });
});

router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "ingredients", filename); // Путь к папке, где хранятся файлы

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Если файл не найден, отправляем 404
    res.status(404).send("File not found");
  }
});

router.delete("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "ingredients", filename);
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

router.put("/:ingredientId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);

  let {
    name,
    image,
    description,
    variations,
    advantages,
    disadvantages,
    origin,
    precautions,
    tips,
    recommendations,
    contraindicates,
    compatibleDishes,
    cookingMethods,
    storageMethods,
    externalLinks,
    shoppingListGroup,
    } = req.body;
    
    variations = JSON.stringify(variations);
  advantages = JSON.stringify(advantages);
  disadvantages = JSON.stringify(disadvantages);
  recommendations = JSON.stringify(recommendations);
  contraindicates = JSON.stringify(contraindicates);
  cookingMethods = JSON.stringify(cookingMethods);
  compatibleDishes = JSON.stringify(compatibleDishes);
  storageMethods = JSON.stringify(storageMethods);
  externalLinks = JSON.stringify(externalLinks);
  precautions = JSON.stringify(precautions);
  tips = JSON.stringify(tips);

    const updateQuery =
        'UPDATE ingredients SET name = ?, image =?, description=?, variations=?, advantages=?, disadvantages=?, origin=?, precautions=?, tips=?, recommendations=?, contraindicates=?, compatibleDishes=?, cookingMethods=?, storageMethods=?, externalLinks=?, shoppingListGroup=? WHERE id = ?';
    
  connection.query(
    updateQuery,
    [name,
    image,
    description,
    variations,
    advantages,
    disadvantages,
    origin,
    precautions,
    tips,
    recommendations,
    contraindicates,
    compatibleDishes,
    cookingMethods,
    storageMethods,
    externalLinks,
      shoppingListGroup,
          ingredientId
      ],
    (error, results, fields) => {
      if (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ info: "Ингредиент с таким именем уже существует" });
        }
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при обновлении секции в базе данных" });
      } else {
        res.status(200).json({ message: "Ингредиент успешно обновлен" });
      }
    }
  );
});

router.put("/:ingredientId/publish", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);

  const updateRoleQuery =
    "UPDATE ingredients SET status = 'public' WHERE id = ?";

  connection.query(updateRoleQuery, [ingredientId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при обновлении роли ингредиента в базе данных" });
    } else {
      res
        .status(200)
        .json({ message: "Роль ингредиента успешно обновлена на public" });
    }
  });
});

router.post("/image", upload.single("image"), (req, res) => {
  const imageFilename = req.file.filename;
  res.status(200).json({
    message: "Изображение секции успешно загружено",
    filename: imageFilename,
  });
});

module.exports = router;
