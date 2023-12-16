const express = require("express");
const bodyParser = require("body-parser");

const router = express.Router();

const cors = require("cors");

const corsOptions = {
  origin: true,
  credentials: true,
};
const connection = require("./db");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: "userpics/", // папка, куда сохранять файлы
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.use(cors(corsOptions));
router.use(bodyParser.json());

router.get("/", (req, res) => {
  const query =
    "SELECT id,username,profileViews,image,emoji,permissions,description,quote,fullName,personalWebsite,socialNetworks,location,role,birthday,registrationDate FROM users";
  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ content: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.json(results);
    }
  });
});

router.put("/public/:userId", (req, res) => {
  const userId = req.params.userId;
  const updatedUserData = req.body;

  const sqlQuery = `
    UPDATE users
    SET
      username = ?,
      image = ?,
      description = ?,
      quote = ?,
      fullName = ?,
      personalWebsite = ?,
      socialNetworks = ?,
      location = ?,
      birthday = ?
    WHERE id = ?;
  `;

  const socialNetworksJsonString = JSON.stringify(
    updatedUserData.socialNetworks
  );

  connection.query(
    sqlQuery,
    [
      updatedUserData.username,
      updatedUserData.image,
      updatedUserData.description,
      updatedUserData.quote,
      updatedUserData.fullName,
      updatedUserData.personalWebsite,
      socialNetworksJsonString,
      updatedUserData.location,
      updatedUserData.birthday,
      userId,
    ],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({
            error: "Произошла ошибка при обновлении данных пользователя.",
          });
      } else {
        console.log("Данные пользователя успешно обновлены:", results);
        res
          .status(200)
          .json({ message: "Данные пользователя успешно обновлены." });
      }
    }
  );
});

router.post("/userpic", upload.single("avatar"), (req, res) => {
  const avatarFileName = req.file.filename;

  res
    .status(200)
    .json({ message: "Аватар успешно загружен", filename: avatarFileName });
});

router.get("/followers/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = "SELECT follower FROM followers WHERE following = ?";

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      const followers = results.map((result) => result.follower);
      res.json(followers);
    }
  });
});

router.delete("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "userpics", filename);
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

router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "userpics", filename); // Путь к папке, где хранятся файлы

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Если файл не найден, отправляем 404
    res.status(404).send("File not found");
  }
});

router.get("/following/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = "SELECT following FROM followers WHERE follower = ?";

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      const followers = results.map((result) => result.follower);
      res.json(followers);
    }
  });
});

router.put("/:userId/:property", (req, res) => {
  const userId = req.params.userId;
  const property = req.params.property;
  const updatedValue = req.body.value;

  const query = `UPDATE users SET ${property} = ? WHERE id = ?`;

  connection.query(query, [updatedValue, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res
        .status(200)
        .json({
          message: `Свойство ${property} пользователя успешно обновлено`,
        });
    }
  });
});

router.post("/unsubscribe", (req, res) => {
  const { follower, following } = req.body;

  if (!follower || !following) {
    return res
      .status(400)
      .json({ error: "Недостаточно данных для отмены подписки" });
  }

  const query = "DELETE FROM followers WHERE follower = ? AND following = ?";

  connection.query(query, [follower, following], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res
        .status(200)
        .json({ success: true, message: "Подписка успешно отменена" });
    }
  });
});

router.post("/subscribe", (req, res) => {
  const { follower, following } = req.body;

  if (!follower || !following) {
    return res
      .status(400)
      .json({ content: "Недостаточно данных для подписки" });
  }

  const checkQuery = "SELECT * FROM followers WHERE follower = ? AND following = ?";
  connection.query(checkQuery, [follower, following], (checkError, checkResults, checkFields) => {
    if (checkError) {
      console.error("Ошибка при выполнении запроса для проверки:", checkError);
      res
        .status(500)
        .json({ content: "Ошибка при выполнении запроса к базе данных" });
    } else {
      if (checkResults.length === 0) {
        const insertQuery = "INSERT INTO followers (follower, following) VALUES (?, ?)";
        connection.query(insertQuery, [follower, following], (insertError, insertResults, insertFields) => {
          if (insertError) {
            console.error("Ошибка при выполнении запроса:", insertError);
            res
              .status(500)
              .json({ content: "Ошибка при выполнении запроса к базе данных" });
          } else {
            res
              .status(201)
              .json({ content: true, message: "Подписка успешно оформлена" });
          }
        });
      } else {
        res.status(201).json({ content: "Запись уже существует" });
      }
    }
  });
});

router.put("/profile-views", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ content: "Недостаточно данных для увеличения profileviews" });
  }

  const checkQuery = "SELECT * FROM users WHERE id = ?";
  connection.query(checkQuery, [userId], (checkError, checkResults, checkFields) => {
    if (checkError) {
      console.error("Ошибка при выполнении запроса для проверки:", checkError);
      res
        .status(500)
        .json({ content: "Ошибка при выполнении запроса к базе данных" });
    } else {
      if (checkResults.length === 1) {
        const currentProfileViews = checkResults[0].profileViews;
        const updatedProfileViews = currentProfileViews + 1;

        const updateQuery = "UPDATE users SET profileViews = ? WHERE id = ?";
        connection.query(updateQuery, [updatedProfileViews, userId], (updateError, updateResults, updateFields) => {
          if (updateError) {
            console.error("Ошибка при выполнении запроса:", updateError);
            res
              .status(500)
              .json({ content: "Ошибка при выполнении запроса к базе данных" });
          } else {
            res
              .status(200)
              .json({ content: true, message: "Profileviews успешно увеличены" });
          }
        });
      } else {
        res.status(404).json({ content: "Пользователь не найден" });
      }
    }
  });
});




module.exports = router;
