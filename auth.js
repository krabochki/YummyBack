const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const connection = require("./db");
const cors = require("cors");

const jwtSecret = "tv2uc6psl52$gt2xu&=1sj!4fb-k6f__nc^ssea1atrxzqplwa";

const corsOptions = {
  origin: true,
  credentials: true,
};

router.use(cors(corsOptions));
router.use(bodyParser.json());
router.use(cookieParser());

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).send();
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ content: "Имя пользователя и пароль обязательны" });
  }

  const getUserQuery = "SELECT * FROM users WHERE (username = ? OR email = ?)";
  connection.query(getUserQuery, [username,username], async (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      res.status(500).json({ content: "Ошибка сервера" });
      return;
    }

    if (results.length === 0) {
      return res.status(401).json({ content: "Пользователя с такой электронной почтой или именем пользователя не найдено. Проверьте данные и повторите попытку." });
    }

    const user = results[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ content: "Введенный вами пароль не совпадает с паролем пользователя с такой электронной почтой или именем пользователя. Проверьте данные и повторите попытку." });
    } else {
      const token = jwt.sign({ username }, jwtSecret);

      res.cookie("token", token, {
        domain: "localhost",
        maxAge: 3600000,
      });

      return res.status(200).json({ token: token });
    }
  });
});

router.get("/token-user", (req, res) => {
  const token = req.cookies.token;

  const noUser={id:0}

  if (!token) {
            return res.status(200).json(noUser);
  } else {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      const query = "SELECT id, email, exclusions, permanent, permissions,role FROM users WHERE (username = ? or email = ?)";
      connection.query(query, [decoded.username,decoded.username], (error, results, fields) => {
        if (error) {
          console.error("Ошибка запроса к базе данных:", error);
          res.status(500).send("Ошибка сервера");
        } else {
          if (results.length > 0) {
            const user = results[0];

            return res.status(200).json(user);
          } else {
            return res.status(404).send("Пользователь не найден");
          }
        }
      });
    } catch (error) {
      return res.status(401).send("Недействительный токен");
    }
  }
});

router.post("/register", async (req, res) => {
  const { email, username, password, registrationDate } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  if (!username || !password || !email) {
    return res.status(400).json({ content: "Имя пользователя, электронная почта и пароль обязательны" });
  }

  const checkUsernameQuery = "SELECT * FROM users WHERE (username = ? OR email = ?)";
  connection.query(
    checkUsernameQuery,
    [username,email],
    (checkError, checkResults) => {
      if (checkError) {
        res.status(500).json({content:"Ошибка сервера"});
        return;
      }
      if (checkResults.length > 0) {
        res.status(400).json({content:"Такое имя пользователя или электронная почта уже заняты. Попробуйте зарегистрироваться с другими данными."});
        return;
      }
      const insertQuery =
              "INSERT INTO users (username, password,email,registrationDate) VALUES (?, ?, ?, ?)";
      connection.query(
        insertQuery,
        [username, hashedPassword,email,registrationDate],
        (insertError, insertResults) => {
          if (insertError) {
            console.error("Ошибка запроса к базе данных:", insertError);
            res.status(500).json({content:"Ошибка сервера"});
          } else {
            res.status(200).json({content:"Пользователь успешно зарегистрирован"});
          }
        }
      );
    }
  );
});

module.exports = router;
