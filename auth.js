const express = require("express");
const router = express.Router();

const link = "http://localhost:4200";

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const connection = require("./db");
const nodemailer = require("nodemailer"); // Добавляем модуль для отправки электронной почты
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
    return res
      .status(400)
      .json({ content: "Имя пользователя и пароль обязательны" });
  }

  const getUserQuery = "SELECT * FROM users WHERE (username = ? OR email = ?)";
  connection.query(
    getUserQuery,
    [username, username],
    async (error, results, fields) => {
      if (error) {
        console.error("Ошибка запроса к базе данных:", error);
        res.status(500).json({ content: "Ошибка сервера" });
        return;
      }

      if (results.length === 0) {
        return res.status(401).json({
          content:
            "Пользователя с такими данными не найдено. Проверьте данные ещё раз и повторите попытку.",
        });
      }

      const user = results[0];

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({
          content:
            "Введенный вами пароль не совпадает с паролем соответствующего пользователя. Проверьте данные и повторите попытку.",
        });
      } else {
        if (user.token) {
          // Если у пользователя есть токен, высылаем новый тип ошибки
          return res.status(401).json({
            content:
              "Вы ещё не подтвердили электронную почту. Перейдите в ваш электронный ящик, в нём хранится письмо для подтверждения регистрации в социальной сети Yummy.",
          });
        } else {
          const token = jwt.sign({ username }, jwtSecret);
          const hour = 3600000;
          const day = hour * 24;
          res.cookie("token", token, {
            domain: "localhost",
            maxAge: day * 5,
          });

          return res.status(200).json({ token: token });
        }
      }
    }
  );
});

router.post("/autologin", async (req, res) => {
  const { username } = req.body;

  const getUserQuery = "SELECT * FROM users WHERE username = ?";
  connection.query(getUserQuery, [username], async (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      res.status(500).json({ content: "Ошибка сервера" });
      return;
    }

    if (results.length === 0) {
      return res.status(401).json();
    } else {
      const token = jwt.sign({ username }, jwtSecret);
      const hour = 3600000;
      const day = hour * 24;
      res.cookie("token", token, {
        domain: "localhost",
        maxAge: day * 5,
      });

      return res.status(200).json({ token: token });
    }
  });
});



router.put("/request-deletion/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { password } = req.body;

  const getCurrentPasswordQuery = "SELECT email, password, delete_token FROM users WHERE id = ?";
  connection.query(
    getCurrentPasswordQuery,
    [userId],
    async (error, results, fields) => {
      if (error) {
        console.error("Ошибка запроса к базе данных:", error);
        res.status(500).json({ message: "Ошибка сервера" });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ message: "Пользователь не найден" });
        return;
      }

      const user = results[0];

      const currentPassword = user.password;
      const passwordMatch = await bcrypt.compare(password, currentPassword);
      if (!passwordMatch) {
        res.status(401).json({ message: "Пароль от аккаунта текущего пользователя введен неверно. Проверьте данные и попробуйте еще раз." });
        return;
      }
      else {

        if (user.delete_token) {
        res.status(401).json({ message: "Письмо для подтверждения удаления аккаунта уже было выслано на вашу электронную почту." });
        return;
      
        }
        

      const deleteToken = generateToken(); // Генерация токена подтверждения

      sendDeleteEmail(user.email, deleteToken, (error, response) => {
        if (error) {
          res.status(404).json({
            content:
              "Ошибка при отправке письма на электронную почту. Проверьте введенные данные еще раз!",
          });
        } else {
          const updateQuery =
            "UPDATE users SET delete_token = ? WHERE id = ?";
          connection.query(
            updateQuery, [deleteToken, userId],
            (updateError, updateResults, updateFields) => {
             

               if (updateError) {
            return res.status(500).json({ message: "Ошибка сервера" });
          }
          return res.status(200).json({
            message: "Письмо для удаления аккаунта успешно отправлено",
          });
              
            }
          );
        }
      });


      }

      
    }
  );
});


router.put("/change-password-secure/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { oldPassword, newPassword } = req.body;

  // Получаем текущий хэшированный пароль пользователя из базы данных
  const getCurrentPasswordQuery = "SELECT password FROM users WHERE id = ?";
  connection.query(
    getCurrentPasswordQuery,
    [userId],
    async (error, results, fields) => {
      if (error) {
        console.error("Ошибка запроса к базе данных:", error);
        res.status(500).json({ error: "Ошибка сервера" });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: "Пользователь не найден" });
        return;
      }

      const currentPassword = results[0].password;

      // Проверяем, совпадает ли введенный старый пароль с текущим паролем пользователя
      const passwordMatch = await bcrypt.compare(oldPassword, currentPassword);
      if (!passwordMatch) {
        res.status(401).json({ error: "Старый пароль введен неверно" });
        return;
      }

      // Хэшируем новый пароль
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Обновляем пароль пользователя в базе данных
      const updatePasswordQuery = "UPDATE users SET password = ? WHERE id = ?";
      connection.query(
        updatePasswordQuery,
        [hashedNewPassword, userId],
        (updateError, updateResults, updateFields) => {
          if (updateError) {
            console.error("Ошибка запроса к базе данных:", updateError);
            res.status(500).json({ error: "Ошибка сервера" });
            return;
          }
          res
            .status(200)
            .json({ message: "Пароль успешно изменен у пользователя" });
        }
      );
    }
  );
});

router.put("/change-password/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = "UPDATE users SET password = ? WHERE id = ?";
  connection.query(
    query,
    [hashedPassword, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка запроса к базе данных:", error);
        res.status(500).json({ error: "Ошибка сервера" });
        return;
      }
      res
        .status(200)
        .json({ message: "Пароль успешно изменен у пользователя" });
    }
  );
});

router.put("/removeTokenFromUser/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = "UPDATE users SET token = NULL WHERE id = ?";
  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      res.status(500).json({ error: "Ошибка сервера" });
      return;
    }
    // Успешно удалили токен у пользователя
    res.status(200).json({ message: "Токен успешно удален у пользователя" });
  });
});


router.put("/removeDeleteTokenFromUser/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = "UPDATE users SET delete_token = NULL WHERE id = ?";
  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      res.status(500).json({ error: "Ошибка сервера" });
      return;
    }
    // Успешно удалили токен у пользователя
    res.status(200).json({ message: "Токен успешно удален у пользователя" });
  });
});

router.put("/removeResetTokenFromUser/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = "UPDATE users SET reset_token = NULL WHERE id = ?";
  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      res.status(500).json({ error: "Ошибка сервера" });
      return;
    }
    // Успешно удалили токен у пользователя
    res.status(200).json({ message: "Токен успешно удален у пользователя" });
  });
});

router.post("/change-token", async (req, res) => {
  const { username } = req.body;
  const getUserQuery = "SELECT id,username FROM users WHERE (username = ?)";
  connection.query(getUserQuery, [username], async (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      res.status(500).json({ content: "Ошибка сервера" });
      return;
    }

    const hour = 3600000;
    const day = hour * 24;

    const token = jwt.sign({ username }, jwtSecret);
    res.clearCookie("token");

    res.cookie("token", token, {
      domain: "localhost",
      maxAge: day * 5,
    });

    return res.status(200).json({ token: token });
  });
});

const generateToken = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

router.get("/findUserByToken/:token", (req, res) => {
  const token = req.params.token;

  const query = "SELECT id, username FROM users WHERE token = ?";
  connection.query(query, [token], (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      return res.status(500).json({ content: "Ошибка сервера" });
    }
    if (results.length === 0) {
      return res.status(404).send("Пользователь не найден. Скорее всего, вы ввели неправильную ссылку в адресную строку или пользователь уже подтвержден.");
    } else {
      const user = results[0];
      return res.status(200).json(user);
    }
  });
});

router.delete("/:userId", (req, res) => {
  const userId = req.params.userId;

  if (userId <= 0) return res
        .status(404)
        .json({ error: "Нет id пользователя" });

  const query = `DELETE FROM users WHERE id = ?`;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({ message: "Рецепт успешно удален" });
    }
  });
});

router.delete("/recipes/:userId", (req, res) => {
  const userId = req.params.userId;

  const query = `DELETE FROM recipes WHERE authorId = ? AND status != 'public'`;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({ message: "Рецепт успешно удален" });
    }
  });
});


router.get("/findUserByDeleteToken/:token", (req, res) => {
  const token = req.params.token;

  const query = "SELECT id, username FROM users WHERE delete_token = ?";
  connection.query(query, [token], (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      return res.status(500).json({ content: "Ошибка сервера" });
    }
    if (results.length === 0) {
      return res.status(404).send("Пользователь не найден. Скорее всего, вы ввели неправильную ссылку в адресную строку или пользователь уже подтвержден.");
    } else {
      const user = results[0];
      return res.status(200).json(user);
    }
  });
});



router.get("/findUserByResetToken/:token", (req, res) => {
  const token = req.params.token;

  const query = "SELECT id, username FROM users WHERE reset_token = ?";
  connection.query(query, [token], (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      return res.status(500).json({ content: "Ошибка сервера" });
    }
    if (results.length === 0) {
      return res.status(404).send("Пользователь не найден");
    } else {
      const user = results[0];
      return res.status(200).json(user);
    }
  });
});

router.get("/token-user", (req, res) => {
  const token = req.cookies.token;

  const noUser = { id: 0 };

  if (!token) {
    return res.status(200).json(noUser);
  } else {
    try {
      const decoded = jwt.verify(token, jwtSecret);
      const query =
        "SELECT id, username,image, fullName, email, exclusions, permanent, permissions,role FROM users WHERE (username = ? or email = ?)";
      connection.query(
        query,
        [decoded.username, decoded.username],
        (error, results, fields) => {
          if (error) {
            console.error("Ошибка запроса к базе данных:", error);
            res.status(500).send("Ошибка сервера");
          } else {
            if (results.length > 0) {
              const user = results[0];

              return res.status(200).json(user);
            } else {
              res.clearCookie("token");

              return res.status(404).send("Пользователь не найден");
            }
          }
        }
      );
    } catch (error) {
      res.clearCookie("token");

      return res.status(401).send("Недействительный токен");
    }
  }
});

router.post("/register", async (req, res) => {
  const { email, username, password, registrationDate } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  if (!username || !password || !email) {
    return res.status(400).json({
      content: "Имя пользователя, электронная почта и пароль обязательны",
    });
  }

  const checkUsernameQuery =
    "SELECT * FROM users WHERE (username = ? OR email = ?)";
  connection.query(
    checkUsernameQuery,
    [username, email],
    (checkError, checkResults) => {
      if (checkError) {
        res.status(500).json({ content: "Ошибка сервера" });
        return;
      }
      if (checkResults.length > 0) {
        res.status(400).json({
          content:
            "Такое имя пользователя или электронная почта уже заняты. Попробуйте зарегистрироваться с другими данными.",
        });
        return;
      }

      const verificationToken = generateToken(); // Генерация токена подтверждения

      sendVerificationEmail(email, verificationToken, (error, response) => {
        if (error) {
          res.status(404).json({
            content:
              "Ошибка при отправке письма на электронную почту. Скорее всего, вашей электронной почты не существует. Проверьте введенные данные еще раз!",
          });
        } else {
          const insertQuery =
            "INSERT INTO users (username, password,email,registrationDate, token) VALUES (?, ?, ?, ?,? )";
          connection.query(
            insertQuery,
            [
              username,
              hashedPassword,
              email,
              registrationDate,
              verificationToken,
            ],
            (insertError, insertResults) => {
              if (insertError) {
                console.error("Ошибка запроса к базе данных:", insertError);
                res.status(500).json({ content: "Ошибка сервера" });
              } else {
                return res.status(200).json({ id: insertResults.insertId });
              }
            }
          );
        }
      });
    }
  );
});

router.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  const resetToken = generateToken();

  const getUserQuery = "SELECT * FROM users WHERE email = ?";
  connection.query(getUserQuery, [email], (error, results, fields) => {
    if (error) {
      console.error("Ошибка запроса к базе данных:", error);
      return res.status(500).json({ message: "Ошибка сервера" });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message:
          "Пользователь с такой электронной почтой не найден. Проверьте данные и попробуйте ещё раз!",
      });
    }

    const user = results[0];

    if (user.reset_token) {
      return res.status(401).json({
        message:
          "Письмо для восстановления пароля пользователя уже было отправлено на эту электронную почту.",
      });
    }


    if (user.token) {
      return res.status(401).json({
        message:
          "Проверьте электронную почту, на нее было выслано письмо для подтверждения регистрации. Восстановление пароля невозможно для неподтвержденных пользователей.",
      });
    }
    
    sendPasswordResetEmail(email, resetToken, (sendError, sendResponse) => {
      if (sendError) {
        return res.status(500).json({
          message: "Произошла ошибка при отправке письма на электронную почту",
        });
      }

      const updateTokenQuery = "UPDATE users SET reset_token = ? WHERE id = ?";
      connection.query(
        updateTokenQuery,
        [resetToken, user.id],
        (updateError, updateResults, updateFields) => {
          if (updateError) {
            return res.status(500).json({ message: "Ошибка сервера" });
          }
          return res.status(200).json({
            message: "Письмо для восстановления пароля успешно отправлено",
          });
        }
      );
    });
  });
});

router.get("/moderators-count", (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM users  WHERE role = 'moderator'`;
  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error(error);
      res.status(500).json({
        error: "Ошибка при попытке получить количество модераторов",
      });
    } else {
      res.status(200).json(results);
    }
  });
})


router.get("/moderators", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
  SELECT COUNT(*) AS totalCount
  FROM users
  WHERE role = 'moderator'
 `;

  const selectQuery = `
    SELECT 
      u.id,
      u.appointmentDate,
      u.username,
      u.fullName,
      u.registrationDate,
      u.image
    FROM users u
    WHERE u.role = 'moderator'
    ORDER BY u.appointmentDate DESC, u.registrationDate DESC
    LIMIT ${startIndex}, ${limit};
 `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      return res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;


    connection.query(selectQuery, (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        return res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        return res.status(200).json({ moderators: results, count: totalCount });
      }
    });
  });
});


function sendPasswordResetEmail(email, token, callback) {
  // Конфигурация для отправки электронной почты (вам нужно настроить свои параметры)
  const transporter = nodemailer.createTransport({
    service: "mail.ru",
    auth: {
      user: "yummail@mail.ru", // Ваш адрес электронной почты на Mail.ru
      pass: "aEmJdmj8J4iwZ8cyK2Wt", // Пароль от вашей учетной записи на Mail.ru
    },
  });

  const mailOptions = {
    from: "Почтальон Yummy <yummail@mail.ru>", // Ваш адрес электронной почты
    to: email,
    subject: "Yummy. Восстановление пароля",
    text: ``,
    html: `
     <p><b> Yummy 🍰. Восстановление пароля </b></p>
   
      <p>Здравствуйте! Вы запросили восстановление пароля для доступа к вашей учетной записи в социальной сети для обмена рецептами <a href="${link}">Yummy</a>.</p>
      <p>Если вы не делали этого запроса, просто игнорируйте это письмо. Также не отвечайте на него, оно было сгенерировано автоматически.</p>
     <p>
       Для восстановления пароля, пожалуйста, перейдите по следующей ссылке: <a href="${link}/password-reset?token=${token}">
       ${link}/password-reset?token=${token}
       </a>  <br>
        Если ссылка не активна, скопируйте ее и вставьте в адресную строку браузера.
     </p>
              <p>Если у вас есть вопросы, жалобы или предложения проекту Yummy, вы можете обратиться на электронную почту: 
           
           <a href="mailto:yummort@mail.ru">yummort@mail.ru</a>
           </p>


  <p>
      C уважением,<br>
      команда Yummy.
  </p>
  `
  };

  // Отправка письма
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error("Ошибка при отправке письма:", error);
      callback(error, null);
    } else {
      callback(null, info.response);
    }
  });
}

function sendDeleteEmail(email, token, callback) {
  const transporter = nodemailer.createTransport({
    service: "mail.ru",
    auth: {
      user: "yummail@mail.ru", 
      pass: "aEmJdmj8J4iwZ8cyK2Wt", 
    },
  });

  const mailOptions = {
    from: "Почтальон Yummy <yummail@mail.ru>", // Ваш адрес электронной почты
    to: email,
    subject: "Yummy. Подтверждение удаления аккаунта",
    text: ``,
    html: `
     <p><b> Yummy 🍰. Подтверждение удаления аккаунта </b></p>
   
      <p>Здравствуйте! Вы запросили удаление вашей учетной записи в социальной сети для обмена рецептами <a href="${link}">Yummy</a>.</p>
      <p><b>
    Пожалуйста, помните, что при возникновении ошибок вы можете написать поддержке Yummy и подробно описать возникшие проблемы, которые привели к такому решению. Ваш вклад в нашу социальную сеть ценен для нас, и мы всегда рады видеть вас снова 💕</b>
</p>

    <p>Если у вас есть вопросы, жалобы или предложения проекту Yummy, вы можете обратиться на электронную почту: 
           
           <a href="mailto:yummort@mail.ru">yummort@mail.ru</a>
           </p>



      <p>Если вы не делали этого запроса, просто игнорируйте это письмо. Также не отвечайте на него, оно было сгенерировано автоматически.</p>
     <p>
       Если вы все же решили удалить свою учетную запись, пожалуйста, подтвердите свое решение, перейдя по следующей ссылке:  <a href="${link}/delete-account?token=${token}">
       ${link}/delete-account?token=${token}
       </a>  <br>
        Если ссылка не активна, скопируйте ее и вставьте в адресную строку браузера.
     </p>
   

       

  <p>
      C уважением,<br>
      команда Yummy.
  </p>
  `
  };

  // Отправка письма
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error("Ошибка при отправке письма:", error);
      callback(error, null);
    } else {
      callback(null, info.response);
    }
  });
}

const sendVerificationEmail = (email, token, callback) => {
  const transporter = nodemailer.createTransport({
    service: "mail.ru",
    auth: {
      user: "yummail@mail.ru", // Ваш адрес электронной почты на Mail.ru
      pass: "aEmJdmj8J4iwZ8cyK2Wt", // Пароль от вашей учетной записи на Mail.ru
    },
  });
  const mailOptions = {
    from: `Почтальон Yummy <yummail@mail.ru>`, // Ваш адрес электронной почты
    to: email,
    subject: "Yummy. Подтверждение регистрации",
    html: `
    <p><b> Yummy 🍰. Подтверждение регистрации </b></p>
   
      <p>Здравствуйте! Вы были зарегистированы в социальной сети для обмена рецептами <a href="${link}">Yummy</a>.</p>
      <p>Если вы не регистрировались, просто игнорируйте это письмо. Также не отвечайте на него, оно было сгенерировано автоматически.</p>
     <p>
       Для подтверждения регистрации перейдите, пожалуйста, по этой ссылке: <a href="${link}/welcome?token=${token}">${link}/welcome?token=${token}</a>  <br>
        Если ссылка не активна, скопируйте ее и вставьте в адресную строку браузера.
     </p>
   
                <p>Если у вас есть вопросы, жалобы или предложения проекту Yummy, вы можете обратиться на электронную почту: 
           
           <a href="mailto:yummort@mail.ru">yummort@mail.ru</a>
           </p>



  <p>
      C уважением,<br>
      команда Yummy.
  </p>
    
    `,
    text: `Перейдите по ссылке для подтверждения регистрации в социальной сети Yummy: ${link}/welcome?token=${token}`,
  };

  // Отправка письма
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, info.response);
    }
  });
};

module.exports = router;
