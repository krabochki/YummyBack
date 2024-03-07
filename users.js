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
  destination: "images/userpics/", // папка, куда сохранять файлы
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

router.get("/updates", (req, res) => {
  const query = "SELECT id,role FROM users";
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

router.get("/updates/:userId", (req, res) => {
  const userId = req.params.userId;
  const query =
    "SELECT id,username,role,permissions,fullName FROM users WHERE id = ?";

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ content: "Ошибка при выполнении запроса к базе данных" });
    } else {
      if (results.length > 0) {
        res.json(results[0]); // Если найдены результаты, возвращаем первый (и единственный) результат
      } else {
        res.status(404).json({ content: "Пользователь не найден" });
      }
    }
  });
});

router.get("/managers-short", (req, res) => {
  const query =
    "SELECT u.id FROM users u WHERE token IS NULL AND role != 'user'";

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

router.get("/all-short", (req, res) => {
  const query =
    "SELECT u.id FROM users u WHERE token IS NULL";

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

router.get("/followers/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
  select id, username, fullName, image
  from users
  where id in (
    select following
    from followers
    where follower = ?
    
    )
    
     ORDER BY fullName, username`;

  connection.query(query, [userId], (error, results, fields) => {
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
router.get("/following/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
  select id, username, fullName, image
  from users
  where id in (
    select follower
    from followers
    where following = ?)
    ORDER BY fullName, username
    `;

  connection.query(query, [userId], (error, results, fields) => {
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

router.get("/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  let selectQuery = "SELECT id FROM users WHERE id = ?";

  connection.query(selectQuery, [userId], (error, users, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(users[0]);
    }
  });
});

router.get("/userpage/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
  select
    id,
    username,
    image,
    description,
    quote,
    fullName,
    socialNetworks,
    personalWebsite,
    location,
    emoji,
    role,
    registrationDate,
    birthday,
    profileViews
  from
    users
  WHERE id = ?`;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ content: "Ошибка при выполнении запроса к базе данных" });
    } else {
      if (results.length > 0) {
        res.json(results[0]); // Если найдены результаты, возвращаем первый (и единственный) результат
      } else {
        res.status(404).json({ content: "Пользователь не найден" });
      }
    }
  });
});

router.get("/edit/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
  select
    id,
    username,
    image,
    description,
    quote,
    fullName,
    socialNetworks,
    personalWebsite,
    location,
    birthday
  from
    users
  WHERE id = ?`;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ content: "Ошибка при выполнении запроса к базе данных" });
    } else {
      if (results.length > 0) {
        res.json(results[0]); // Если найдены результаты, возвращаем первый (и единственный) результат
      } else {
        res.status(404).json({ content: "Пользователь не найден" });
      }
    }
  });
});

router.get("/user-statistics/:userId/:currentUserId", (req, res) => {
  const userId = Number(req.params.userId);
  const currentUserId = Number(req.params.currentUserId);
  const authorMode = currentUserId === userId;

  const query = `
  SELECT 
    (SELECT COUNT(*) FROM followers AS f1 WHERE f1.following = u.id) AS followers,
    (SELECT COUNT(*) FROM followers AS f2 WHERE f2.follower = u.id) AS followings,
    (SELECT COUNT(*) FROM recipes AS r WHERE r.authorId = u.id ${
      authorMode ? "" : "AND r.status = 'public'"
    }) AS recipes,
        (CASE WHEN EXISTS (SELECT * FROM followers WHERE follower = ? AND following = u.id) THEN true ELSE false END) AS follower

  FROM 
      users u
  WHERE id = ?`;

  connection.query(query, [currentUserId, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ content: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json(results[0]);
    }
  });
});

router.get("/user-recipes-statistics/:userId", (req, res) => {
  const userId = req.params.userId;
  const query = `
  SELECT
    SUM(likesCount) AS likes,
    SUM(cooksCount) AS cooks,
    SUM(commentsCount) AS comments
  FROM (
    SELECT
      COUNT(likes.recipeId) AS likesCount,
      COUNT(cooks.recipeId) AS cooksCount,
      COUNT(comments.recipeId) AS commentsCount
    FROM recipes r   
    LEFT JOIN \`recipes-likes\` AS likes ON r.id = likes.recipeId
    LEFT JOIN \`recipes-cooks\` AS cooks ON r.id = cooks.recipeId
    LEFT JOIN \`comments\` AS comments ON r.id = comments.recipeId
    WHERE r.status = 'public' AND r.authorId = ?
    GROUP BY r.id)
  as q`;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ content: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json(results[0]);
    }
  });
});

router.put("/userpic/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const { image } = req.body;
  console.log(image);
  console.log(userId);
  const sqlQuery = `
    UPDATE users
    SET
      image = ?
    WHERE id = ?;
  `;

  connection.query(sqlQuery, [image, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({
        error: "Произошла ошибка при обновлении данных пользователя.",
      });
    } else {
      res
        .status(200)
        .json({ message: "Данные пользователя успешно обновлены." });
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
        if (error.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json("Пользователь с таким именем пользователя уже существует");
        }
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({
          error: "Произошла ошибка при обновлении данных пользователя.",
        });
      } else {
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

router.get("/followersIds/:userId", (req, res) => {
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
  const filePath = path.join(__dirname, "\\images\\userpics", filename);
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
  const filePath = path.join(__dirname, "\\images\\userpics", filename); // Путь к папке, где хранятся файлы

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

  let query = `UPDATE users SET ${property} = ? WHERE id = ?`;

  if (property === "role" && updatedValue === "moderator") {
    query = `UPDATE users SET ${property} = ?, appointmentDate=NOW() WHERE id = ?`;
  }

  if (property === "role" && updatedValue === "user") {
    query = `UPDATE users SET ${property} = ?, appointmentDate= NULL WHERE id = ?`;
  }

  connection.query(query, [updatedValue, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({
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

  const checkQuery =
    "SELECT * FROM followers WHERE follower = ? AND following = ?";
  connection.query(
    checkQuery,
    [follower, following],
    (checkError, checkResults, checkFields) => {
      if (checkError) {
        console.error(
          "Ошибка при выполнении запроса для проверки:",
          checkError
        );
        res
          .status(500)
          .json({ content: "Ошибка при выполнении запроса к базе данных" });
      } else {
        if (checkResults.length === 0) {
          const insertQuery =
            "INSERT INTO followers (follower, following) VALUES (?, ?)";
          connection.query(
            insertQuery,
            [follower, following],
            (insertError, insertResults, insertFields) => {
              if (insertError) {
                console.error("Ошибка при выполнении запроса:", insertError);
                res.status(500).json({
                  content: "Ошибка при выполнении запроса к базе данных",
                });
              } else {
                res.status(201).json({
                  content: true,
                  message: "Подписка успешно оформлена",
                });
              }
            }
          );
        } else {
          res.status(201).json({ content: "Запись уже существует" });
        }
      }
    }
  );
});

router.delete("/limitations/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const limitation = req.query.limitation;

  if (!userId || !limitation) {
    return res
      .status(400)
      .json({ error: "Недостаточно данных" });
  }

  
  const query = "DELETE FROM limitations WHERE limitation = ? AND userId = ?";

  connection.query(query, [limitation, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res
        .status(200)
        .json({ success: true, message: "Успешно" });
    }
  });
});


router.post("/limitations/:userId", (req, res) => {
  const { limitation } = req.body;
  const userId = Number(req.params.userId);

  if (!limitation || !userId) {
    return res
      .status(400)
      .json({ content: "Недостаточно данных" });
  }
  

      const checkQuery =
    "SELECT * FROM limitations WHERE limitation = ? AND userId = ?";
  connection.query(
    checkQuery,
    [limitation, userId],
    (checkError, checkResults, checkFields) => {
      if (checkError) {
        console.error(
          "Ошибка при выполнении запроса для проверки:",
          checkError
        );
        res
          .status(500)
          .json({ content: "Ошибка при выполнении запроса к базе данных" });
      } else {
        if (checkResults.length === 0) {


          const insertQuery =
            "INSERT INTO limitations (userId, limitation) VALUES (?, ?)";
          connection.query(
            insertQuery,
            [userId, limitation],
            (insertError, insertResults, insertFields) => {
              if (insertError) {
                console.error("Ошибка при выполнении запроса:", insertError);
                res.status(500).json({
                  content: "Ошибка при выполнении запроса к базе данных",
                });
              } else {
                res.status(201).json({
                  content: true,
                  message: "Разрешение успешно добавлено",
                });
              }
            }
          );

        }
        else {
                    res.status(201).json({ content: "Запись уже существует" });

        }
      }
    })
       
      
});

router.get("/limitation/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const limitation = req.query.limitation;


  if (!userId || !limitation) {
    return res
      .status(400)
      .json({ content: "Недостаточно данных" });
  }
  
          const query =
            "SELECT limitation FROM limitations where userId = ? and limitation = ?";
          connection.query(
            query,
            [userId, limitation],
            (error, results, fields) => {
              if (error) {
                console.error("Ошибка при выполнении запроса:", error);
                res.status(500).json({
                  content: "Ошибка при выполнении запроса к базе данных",
                });
              } else {
                
                  res.status(201).json(!!results.length)
              }
            }
          );
       
      
});

router.get("/limitations/:userId", (req, res) => {
  const userId = Number(req.params.userId);

  if (!userId) {
    return res
      .status(400)
      .json({ content: "Недостаточно данных" });
  }
  
          const query =
            "SELECT limitation FROM limitations where userId = ?";
          connection.query(
            query,
            [userId],
            (error, results, fields) => {
              if (error) {
                console.error("Ошибка при выполнении запроса:", error);
                res.status(500).json({
                  content: "Ошибка при выполнении запроса к базе данных",
                });
              } else {
                      const limitations = results.map((result) => result.limitation);

                res.status(201).json(limitations);
              }
            }
          );
       
      
});


router.put("/profile-views", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ content: "Недостаточно данных для увеличения profileviews" });
  }

  const checkQuery = "SELECT * FROM users WHERE id = ?";
  connection.query(
    checkQuery,
    [userId],
    (checkError, checkResults, checkFields) => {
      if (checkError) {
        console.error(
          "Ошибка при выполнении запроса для проверки:",
          checkError
        );
        res
          .status(500)
          .json({ content: "Ошибка при выполнении запроса к базе данных" });
      } else {
        if (checkResults.length === 1) {
          const currentProfileViews = checkResults[0].profileViews;
          const updatedProfileViews = currentProfileViews + 1;

          const updateQuery = "UPDATE users SET profileViews = ? WHERE id = ?";
          connection.query(
            updateQuery,
            [updatedProfileViews, userId],
            (updateError, updateResults, updateFields) => {
              if (updateError) {
                console.error("Ошибка при выполнении запроса:", updateError);
                res.status(500).json({
                  content: "Ошибка при выполнении запроса к базе данных",
                });
              } else {
                res.status(200).json({
                  content: true,
                  message: "Profileviews успешно увеличены",
                });
              }
            }
          );
        } else {
          res.status(404).json({ content: "Пользователь не найден" });
        }
      }
    }
  );
});

router.get("/productive/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
      SELECT u.id, u.username, COUNT(r.id) AS recipe_count
      FROM users u
      LEFT JOIN (
          SELECT *
          FROM recipes
          WHERE status = 'public' OR authorId = ?
      ) r ON r.authorId = u.id
      WHERE u.token is null
      GROUP BY u.id, u.username
      HAVING COUNT(r.id) > 0
    )
    AS q
  `;

  const selectQuery = `
        SELECT u.id, u.username, u.fullName, u.image, u.role, u.location, 
          r.recipesCount, f.followersCount, f2.followingsCount, u.emoji,
        CASE WHEN EXISTS (SELECT 1 FROM followers WHERE following = u.id AND follower = ?) THEN 1 ELSE 0 END AS isFollower
    FROM users u
    LEFT JOIN (
        SELECT authorId, COUNT(id) AS recipesCount
        FROM recipes
        WHERE status = 'public' OR authorId =?
        GROUP BY authorId
    ) r ON r.authorId = u.id
    LEFT JOIN (
        SELECT following, COUNT(follower) AS followersCount
        FROM followers
        GROUP BY following
    ) f ON f.following = u.id
    LEFT JOIN (
        SELECT follower, COUNT(following) AS followingsCount
        FROM followers
        GROUP BY follower
    ) f2 ON f2.follower = u.id
    WHERE r.recipesCount > 0  and u.token is null
    ORDER BY r.recipesCount DESC, u.username, u.fullName, u.id
        LIMIT ${startIndex}, ${limit};
  `;

  connection.query(countQuery, [userId], (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(
      selectQuery,
      [userId, userId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при получении данных из базы данных" });
        } else {
          res.status(200).json({ users: results, count: totalCount });
        }
      }
    );
  });
});

router.get("/managers/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
            SELECT 
          u.id
      FROM
          users u
      WHERE 
          (u.role = 'admin' OR u.role = 'moderator') AND  u.token is null
    )
    AS q
  `;

  const selectQuery = `
        SELECT u.id, u.profileViews, u.username, u.fullName, u.image, u.role, u.location, 
          r.recipesCount, f.followersCount, f2.followingsCount, u.emoji,
        CASE WHEN EXISTS (SELECT 1 FROM followers WHERE following = u.id AND follower = ?) THEN 1 ELSE 0 END AS isFollower
    FROM users u
    LEFT JOIN (
        SELECT authorId, COUNT(id) AS recipesCount
        FROM recipes
        WHERE status = 'public' OR authorId =?
        GROUP BY authorId
    ) r ON r.authorId = u.id
    LEFT JOIN (
        SELECT following, COUNT(follower) AS followersCount
        FROM followers
        GROUP BY following
    ) f ON f.following = u.id
    LEFT JOIN (
        SELECT follower, COUNT(following) AS followingsCount
        FROM followers
        GROUP BY follower
    ) f2 ON f2.follower = u.id
    WHERE           (u.role = 'admin' OR u.role = 'moderator') AND  u.token is null
    ORDER BY u.role desc,  f.followersCount DESC, r.recipesCount DESC, u.username, u.fullName, u.id
        LIMIT ${startIndex}, ${limit};
 `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(
      selectQuery,
      [userId, userId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при получении данных из базы данных" });
        } else {
          res.status(200).json({ users: results, count: totalCount });
        }
      }
    );
  });
});

router.get("/nearby/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
            SELECT 
          u.id
      FROM
          users u
      WHERE  u.id != ?  AND 
          u.token is null
      and
          (
      u.location LIKE concat('%',(select location from users where id = ?),'%')
    OR ((select location from users where id = ?) LIKE concat('%',u.location,'%')))
    )
    AS q
  `;

  const selectQuery = `
        SELECT u.id, u.profileViews, u.username, u.fullName, u.image, u.role, u.location, 
          r.recipesCount, f.followersCount, f2.followingsCount, u.emoji,
        CASE WHEN EXISTS (SELECT 1 FROM followers WHERE following = u.id AND follower = ?) THEN 1 ELSE 0 END AS isFollower
    FROM users u
    LEFT JOIN (
        SELECT authorId, COUNT(id) AS recipesCount
        FROM recipes
        WHERE status = 'public' OR authorId =?
        GROUP BY authorId
    ) r ON r.authorId = u.id
    LEFT JOIN (
        SELECT following, COUNT(follower) AS followersCount
        FROM followers
        GROUP BY following
    ) f ON f.following = u.id
    LEFT JOIN (
        SELECT follower, COUNT(following) AS followingsCount
        FROM followers
        GROUP BY follower
    ) f2 ON f2.follower = u.id
    WHERE
    u.id != ? and
      u.token is null
      AND (
          u.location LIKE concat('%',(select location from users where id = ?),'%')
        OR ((
          select location from users where id = ?) LIKE concat('%',u.location,'%')))

    ORDER BY   f.followersCount DESC, r.recipesCount DESC, u.username, u.fullName, u.id
        LIMIT ${startIndex}, ${limit};
 `;

  connection.query(
    countQuery,
    [userId, userId, userId],
    (error, countResults, fields) => {
      if (error) {
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      }

      const totalCount = countResults[0].totalCount;

      connection.query(
        selectQuery,
        [userId, userId, userId, userId, userId],
        (error, results, fields) => {
          if (error) {
            console.error("Ошибка при выполнении запроса:", error);
            res
              .status(500)
              .json({ error: "Ошибка при получении данных из базы данных" });
          } else {
            res.status(200).json({ users: results, count: totalCount });
          }
        }
      );
    }
  );
});

router.get("/search/all", (req, res) => {
  const searchText = req.query.search;
  const selectQuery = `SELECT u.id, u.username, u.fullName 
     FROM users u
     WHERE (token IS null)
     AND (u.fullName LIKE ? or u.username LIKE ?)
     LIMIT 8
     `;

  connection.query(
    selectQuery,
    [`%${searchText}%`, `%${searchText}%`],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});


router.get("/search/productive/:userId", (req, res) => {

    const userId = Number(req.params.userId);

  const searchText = req.query.search;
  const selectQuery = `
    SELECT u.id, u.username, u.fullName
    FROM users u
    LEFT JOIN (
      SELECT *
      FROM recipes
      WHERE status = 'public' OR authorId = ?
       ) r ON r.authorId = u.id
    WHERE (token IS NULL
      AND (u.fullName LIKE ? or u.username LIKE ?))
    GROUP BY u.id, u.username
    HAVING COUNT(r.id) > 0
    LIMIT 8`;

  connection.query(
    selectQuery,
    [userId,`%${searchText}%`, `%${searchText}%`],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});


// router.get("/productive/:userId", (req, res) => {
//   const countQuery = `
//     SELECT COUNT(*) AS totalCount
//     FROM (
//       SELECT u.id, u.username, COUNT(r.id) AS recipe_count
//       FROM users u
//       LEFT JOIN (
//           SELECT *
//           FROM recipes
//           WHERE status = 'public' OR authorId = ?
//       ) r ON r.authorId = u.id
//       WHERE u.token is null
//       GROUP BY u.id, u.username
//       HAVING COUNT(r.id) > 0
//     )
//     AS q
//   `;
// });


router.get("/search/managers", (req, res) => {
  const searchText = req.query.search;
  const selectQuery = `
    SELECT u.id, u.username, u.fullName
    FROM users u
    WHERE (token IS NULL
      AND (u.role = 'moderator' OR u.role = 'admin')
      AND (u.fullName LIKE ? or u.username LIKE ?))
    LIMIT 8`;

  connection.query(
    selectQuery,
    [`%${searchText}%`, `%${searchText}%`],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

router.get("/search/most-viewed", (req, res) => {
  const searchText = req.query.search;
  const selectQuery = `
    SELECT u.id, u.username, u.fullName
    FROM users u
    WHERE (token IS NULL
      AND (u.profileViews > 0)
      AND (u.fullName LIKE ? or u.username LIKE ?))
    LIMIT 8`;

  connection.query(
    selectQuery,
    [`%${searchText}%`, `%${searchText}%`],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

router.get("/search/followings/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const searchText = req.query.search;
  const selectQuery = `
    SELECT u.id, u.username, u.fullName
    FROM users u
    INNER JOIN followers f ON f.following = u.id AND f.follower = ?
    WHERE (token IS NULL AND (u.fullName LIKE ? or u.username LIKE ?))
    LIMIT 8`;

  connection.query(
    selectQuery,
    [userId, `%${searchText}%`, `%${searchText}%`],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

router.get("/search/popular", (req, res) => {
  const searchText = req.query.search;
  const selectQuery = `
    SELECT u.id, u.fullName, u.username
    FROM users u
    LEFT JOIN
      (SELECT following, COUNT(follower) AS followersCount
       FROM followers
       GROUP BY following) f ON f.following = u.id
    WHERE f.followersCount > 0 AND u.token IS NULL AND (u.fullName LIKE ? or u.username LIKE ?)`;

  connection.query(
    selectQuery,
    [`%${searchText}%`, `%${searchText}%`],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

router.get("/search/nearby/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const searchText = req.query.search;
  const selectQuery = `

    SELECT u.id, u.username, u.fullName
    FROM users u
    WHERE u.id != ?
      AND u.token IS NULL
      AND (
        u.location LIKE concat('%',(
          SELECT location
          FROM users
          WHERE id = ?),'%')
      OR (
        (SELECT location
         FROM users
         WHERE id = ?)
        LIKE concat('%',u.location,'%')))
      AND (u.fullName LIKE ? or u.username LIKE ?)
      LIMIT 8`;

  connection.query(
    selectQuery,
    [userId, userId, userId, `%${searchText}%`, `%${searchText}%`],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});

router.get("/my-followers/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
            SELECT 
          u.id
      FROM
          users u
          INNER JOIN followers f ON f.following = u.id AND f.follower = ?

      WHERE 
          u.token is null
    )
    AS q
  `;

  const selectQuery = `
    SELECT u.id, u.profileViews, u.username, u.fullName, u.image, u.role, u.location, 
          r.recipesCount, f.followersCount, f2.followingsCount, u.emoji,
        CASE WHEN EXISTS (SELECT 1 FROM followers WHERE following = u.id AND follower = ?) THEN 1 ELSE 0 END AS isFollower
    FROM users u
    LEFT JOIN (
        SELECT authorId, COUNT(id) AS recipesCount
        FROM recipes
        WHERE status = 'public' OR authorId =?
        GROUP BY authorId
    ) r ON r.authorId = u.id
    LEFT JOIN (
        SELECT following, COUNT(follower) AS followersCount
        FROM followers
        GROUP BY following
    ) f ON f.following = u.id
    LEFT JOIN (
        SELECT follower, COUNT(following) AS followingsCount
        FROM followers
        GROUP BY follower
    ) f2 ON f2.follower = u.id

    INNER JOIN followers f3 ON f3.following = u.id AND f3.follower = ?

    WHERE  u.token is null
    ORDER BY f.followersCount DESC, r.recipesCount DESC, u.username, u.fullName, u.id
        LIMIT ${startIndex}, ${limit};
 `;

  connection.query(countQuery, [userId], (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(
      selectQuery,
      [userId, userId, userId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при получении данных из базы данных" });
        } else {
          res.status(200).json({ users: results, count: totalCount });
        }
      }
    );
  });
});

router.get("/most-viewed/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
            SELECT 
          u.id
      FROM
          users u
      WHERE 
          u.profileViews > 0 and u.token is null
    )
    AS q
  `;

  const selectQuery = `
        SELECT u.id, u.profileViews, u.username, u.fullName, u.image, u.role, u.location, 
          r.recipesCount, f.followersCount, f2.followingsCount, u.emoji,
        CASE WHEN EXISTS (SELECT 1 FROM followers WHERE following = u.id AND follower = ?) THEN 1 ELSE 0 END AS isFollower
    FROM users u
    LEFT JOIN (
        SELECT authorId, COUNT(id) AS recipesCount
        FROM recipes
        WHERE status = 'public' OR authorId =?
        GROUP BY authorId
    ) r ON r.authorId = u.id
    LEFT JOIN (
        SELECT following, COUNT(follower) AS followersCount
        FROM followers
        GROUP BY following
    ) f ON f.following = u.id
    LEFT JOIN (
        SELECT follower, COUNT(following) AS followingsCount
        FROM followers
        GROUP BY follower
    ) f2 ON f2.follower = u.id
    WHERE u.profileViews > 0  and u.token is null
    ORDER BY u.profileViews DESC, f.followersCount DESC, r.recipesCount DESC, u.username, u.fullName, u.id
        LIMIT ${startIndex}, ${limit};
 `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(
      selectQuery,
      [userId, userId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при получении данных из базы данных" });
        } else {
          res.status(200).json({ users: results, count: totalCount });
        }
      }
    );
  });
});

router.get("/popular/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
            SELECT 
          u.id, f.followersCount
      FROM
          users u
              LEFT JOIN
          (SELECT 
              following, COUNT(follower) AS followersCount
          FROM
              followers
          GROUP BY following) f ON f.following = u.id
      WHERE
          f.followersCount > 0 and u.token is null
    )
    AS q
  `;

  const selectQuery = `
    SELECT u.id, u.username, u.fullName, u.image, u.role, u.location, 
          r.recipesCount, f.followersCount, f2.followingsCount, u.emoji,
        CASE WHEN EXISTS (SELECT 1 FROM followers WHERE following = u.id AND follower = ?) THEN 1 ELSE 0 END AS isFollower
    FROM users u
    LEFT JOIN (
        SELECT authorId, COUNT(id) AS recipesCount
        FROM recipes
        WHERE status = 'public' OR authorId =?
        GROUP BY authorId
    ) r ON r.authorId = u.id
    LEFT JOIN (
        SELECT following, COUNT(follower) AS followersCount
        FROM followers
        GROUP BY following
    ) f ON f.following = u.id
    LEFT JOIN (
        SELECT follower, COUNT(following) AS followingsCount
        FROM followers
        GROUP BY follower
    ) f2 ON f2.follower = u.id
    WHERE f.followersCount > 0  and u.token is null

    ORDER BY f.followersCount DESC, r.recipesCount DESC, u.username, u.fullName, u.id
        LIMIT ${startIndex}, ${limit};
 `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(
      selectQuery,
      [userId, userId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при получении данных из базы данных" });
        } else {
          res.status(200).json({ users: results, count: totalCount });
        }
      }
    );
  });
});

router.get("/new/:userId", (req, res) => {
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
          SELECT 
          u.id
      FROM
          users u
          WHERE u.token is null

    )
    AS q
  `;

  const selectQuery = `
    SELECT u.id, u.username, u.fullName, u.image, u.role, u.location, 
       r.recipesCount, f.followersCount, f2.followingsCount, u.emoji,
          CASE WHEN EXISTS (SELECT 1 FROM followers WHERE following = u.id AND follower = ?) THEN 1 ELSE 0 END AS isFollower
      FROM users u
      LEFT JOIN (
          SELECT authorId, COUNT(id) AS recipesCount
          FROM recipes
          WHERE status = 'public' OR authorId =?
          GROUP BY authorId
      ) r ON r.authorId = u.id
      LEFT JOIN (
          SELECT following, COUNT(follower) AS followersCount
          FROM followers
          GROUP BY following
      ) f ON f.following = u.id
      LEFT JOIN (
          SELECT follower, COUNT(following) AS followingsCount
          FROM followers
          GROUP BY follower
      ) f2 ON f2.follower = u.id
      WHERE u.token is null
      ORDER BY u.registrationDate DESC, f.followersCount, r.recipesCount DESC, u.username, u.fullName, u.id
          LIMIT ${startIndex}, ${limit};
 `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(
      selectQuery,
      [userId, userId],
      (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res
            .status(500)
            .json({ error: "Ошибка при получении данных из базы данных" });
        } else {
          res.status(200).json({ users: results, count: totalCount });
        }
      }
    );
  });
});

module.exports = router;
