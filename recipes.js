const express = require("express");
const router = express.Router();

const POPULAR_RECIPES_LENGTH = 30;

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

const fs = require("fs");

const storage = multer.diskStorage({
  destination: "recipes/", // папка, куда сохранять файлы
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // уникальное имя файла
  },
});

const upload = multer({ storage });

router.post("/image", upload.single("image"), (req, res) => {
  const imageFilename = req.file.filename;
  res.status(200).json({
    message: "Изображение секции успешно загружено",
    filename: imageFilename,
  });
});

router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "recipes", filename); // Путь к папке, где хранятся файлы

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Если файл не найден, отправляем 404
    res.status(404).send("File not found");
  }
});

router.post("/", (req, res) => {
  let {
    name,
    mainImage,
    publicationDate,
    authorId,
    description,
    status,
    preparationTime,
    cookingTime,
    servings,
    origin,
    nutritions,
    instructions,
    history,
  } = req.body;

  nutritions = JSON.stringify(nutritions);
  instructions = JSON.stringify(instructions);

  if (!name || !authorId) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для добавления категории" });
  }

  const insertQuery = `INSERT INTO recipes (
    name,
    mainImage,
    sendDate,
    authorId,
    description,
    status,
    preparationTime,
    cookingTime,
    servings,
    origin,
    nutritions,
    instructions,
    history)
    VALUES
    (?,?,?,?,?,?,?,?,?,?,?,?,?)`;

  connection.query(
    insertQuery,
    [
      name,
      mainImage,
      new Date(publicationDate),
      authorId,
      description,
      status,
      preparationTime,
      cookingTime,
      servings,
      origin,
      nutritions,
      instructions,
      history,
    ],
    (error, results, fields) => {
      if (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ info: "Рецепт с таким именем уже существует" });
        }
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ info: "Ошибка при выполнении запроса к базе данных" });
      } else {
        const recipeId = results.insertId;

        res.status(201).json({ id: recipeId });
      }
    }
  );
});

router.put("/set-category/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;
  const categoryId = req.body.id;

  const query =
    "INSERT INTO `recipes-categories` (recipeId,categoryId) VALUES (?,?)";

  connection.query(query, [recipeId, categoryId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({
        message: `Категория и рецепт успешно связаны`,
      });
    }
  });
});

router.get("/categories/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;

  const selectQuery = `
    SELECT categoryId
    FROM \`recipes-categories\`
    WHERE recipeId = ?;
  `;

  connection.query(selectQuery, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const categoriesIds = results.map((result) => result.categoryId);
      res.status(200).json({ categoriesIds });
    }
  });
});

router.get("/likes/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;

  const selectQuery = `
    SELECT userId
    FROM \`recipes-likes\`
    WHERE recipeId = ?;
  `;

  connection.query(selectQuery, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const likesIds = results.map((result) => result.userId);
      res.status(200).json({ likesIds });
    }
  });
});


router.get("/cooks/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;

  const selectQuery = `
    SELECT userId
    FROM \`recipes-cooks\`
    WHERE recipeId = ?;
  `;

  connection.query(selectQuery, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const cooksIds = results.map((result) => result.userId);
      res.status(200).json({ cooksIds });
    }
  });
});

router.get("/author/:userId", (req, res) => {
  const userId = req.params.userId;

  const selectQuery = `
    SELECT id, username, fullName, image
    FROM users
    WHERE id = ?;
  `;

  connection.query(selectQuery, [userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({
        error: "Ошибка при получении данных пользователя из базы данных",
      });
    } else {
      if (results.length > 0) {
        res.status(200).json(results[0]);
      } else {
        res.status(404).json({ error: "Пользователь не найден" });
      }
    }
  });
});

router.get("/favorites/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;

  const selectQuery = `
    SELECT userId
    FROM \`recipes-favorites\`
    WHERE recipeId = ?;
  `;

  connection.query(selectQuery, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const favoritesIds = results.map((result) => result.userId);
      res.status(200).json({ favoritesIds });
    }
  });
});

router.get("/votes/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;

  const selectQuery = `
    SELECT userId AS user,
       CASE WHEN vote = 0 THEN 'false' ELSE 'true' END AS answer
    FROM \`recipes-votes\`
    WHERE recipeId = ?;
  `;

  connection.query(selectQuery, [recipeId], (error, results, fields) => {
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




router.get("/search/my/:userId", (req, res) => {
    const userId = Number(req.params.userId);

  const searchText = req.query.search; 
  const selectQuery =
  `SELECT id,name FROM recipes WHERE  authorId = ${userId} AND name LIKE ?`;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/short-recipe/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);
  const selectQuery =
  `SELECT id,name FROM recipes WHERE  id = ?`;

  connection.query(selectQuery, recipeId, (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results[0]);
    }
  });
});




router.get("/search/public-and-my/:userId", (req, res) => {
    const userId = Number(req.params.userId);

  const searchText = req.query.search; 
  const selectQuery =
  `SELECT id,name FROM recipes WHERE (status = 'public'  OR authorId = ${userId}) AND name LIKE ?`;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});


router.get("/by-user/:userId", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const userId = req.params.userId;
  const mode = req.query.mode;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE authorId = ?
  `;

  let selectQuery = `
  SELECT 
    recipes.id, 
    recipes.name, 
    recipes.mainImage,
    recipes.authorId,
    recipes.status
  FROM recipes
  WHERE recipes.authorId = ?
  ORDER BY recipes.sendDate DESC

  LIMIT ${startIndex}, ${limit};
`;

  if (mode === "full") {
    selectQuery = `
    SELECT * from recipes
    WHERE authorId = ? 
    LIMIT ${startIndex}, ${limit};
  `;
  }

  connection.query(countQuery, [userId], (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, [userId], (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/public-by-user/:userId/:recipeId", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const userId = req.params.userId;
  const recipeId = req.params.recipeId;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE authorId = ?
  `;

  const selectQuery = `
  SELECT 
    recipes.id, 
    recipes.name, 
    recipes.mainImage,
    recipes.authorId,
    recipes.status
  FROM recipes
  WHERE recipes.authorId = ? AND recipes.status = 'public' AND  recipes.id != ${recipeId}
  ORDER BY recipes.sendDate DESC
  LIMIT ${startIndex}, ${limit};
`;


  connection.query(countQuery, [userId], (error, countResults, fields) => {
    if (error) {
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, [userId], (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/recipe/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);
  let selectQuery = "SELECT * FROM recipes WHERE id = ?";

  connection.query(selectQuery, [recipeId], (error, recipe, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(recipe[0]);
    }
  });
});



router.get("/search/by-category/:categoryId/:userId", (req, res) => {
const categoryId = Number(req.params.categoryId)
  const userId = Number(req.params.userId)

  const searchText = req.query.search; 
  const selectQuery = `
      SELECT 
      recipes.id, 
      recipes.name
      FROM recipes
      JOIN \`recipes-categories\` ON recipes.id = \`recipes-categories\`.recipeId
      WHERE \`recipes-categories\`.categoryId = ${categoryId} AND  name LIKE ? AND ( recipes.status = 'public' OR recipes.authorId = ${userId})
 `;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/by-category/:categoryId/:userId", (req, res) => {
  const categoryId = Number(req.params.categoryId)
  const userId = Number(req.params.userId)
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `SELECT 
      COUNT(*) AS totalCount
      FROM recipes
      JOIN \`recipes-categories\` ON recipes.id = \`recipes-categories\`.recipeId
      WHERE \`recipes-categories\`.categoryId = ${categoryId} AND (recipes.status = 'public' OR recipes.authorId = ${userId})`;

  const selectQuery = `
      SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status
      FROM recipes
      JOIN \`recipes-categories\` ON recipes.id = \`recipes-categories\`.recipeId
      WHERE \`recipes-categories\`.categoryId = ${categoryId} AND (recipes.status = 'public' OR recipes.authorId = ${userId})
      LIMIT ${startIndex}, ${limit};
 `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});


router.get("/popular", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE status = 'public'
  `;

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
      COUNT(likes.recipeId) AS likeCount
    FROM recipes
    LEFT JOIN \`recipes-likes\` AS likes ON recipes.id = likes.recipeId
    WHERE status = 'public'
    GROUP BY recipes.id
    ORDER BY likeCount DESC
    LIMIT ${startIndex}, ${limit};
 `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/awaits-count", (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM recipes  WHERE status = 'awaits'`;
  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error(error);
      res
        .status(500)
        .json({
          error: "Ошибка при попытке получить количество ожидающих обновлений",
        });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/most-cooked", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE status = 'public'
  `;

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
      COUNT(cooks.recipeId) AS cookCount
    FROM recipes
    LEFT JOIN \`recipes-cooks\` AS cooks ON recipes.id = cooks.recipeId
    WHERE status = 'public'
    GROUP BY recipes.id
    ORDER BY cookCount DESC
    LIMIT ${startIndex}, ${limit};
 `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/search/public", (req, res) => {
  const searchText = req.query.search; 
  const selectQuery =
    "SELECT id,name FROM recipes WHERE status = 'public' AND name LIKE ?";

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});


router.get("/search/favorite/:userId", (req, res) => {
    const userId = Number(req.params.userId);

  const searchText = req.query.search; 

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name,
      COUNT(favorites.recipeId) AS favoritesCount
    FROM recipes
    LEFT JOIN \`recipes-favorites\` AS favorites ON recipes.id = favorites.recipeId
    WHERE status = 'public' AND favorites.userId = ${userId}  AND  name LIKE ?
    GROUP BY recipes.id
    ORDER BY favoritesCount DESC
 `;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.put("/approve/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);


  const updateRoleQuery =
    `UPDATE recipes SET sendDate = now() , status = 'public' WHERE id = ?`;

  connection.query(updateRoleQuery, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при обновлении роли категории в базе данных" });
    } else {
      res
        .status(200)
        .json({ message: "Роль категории успешно обновлена на public" });
    }
  });
});

router.put("/dismiss/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);

  const updateRoleQuery =
    "UPDATE recipes SET status = 'private' WHERE id = ?";

  connection.query(updateRoleQuery, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при обновлении роли категории в базе данных" });
    } else {
      res
        .status(200)
        .json({ message: "Роль категории успешно обновлена на public" });
    }
  });
});

router.get("/awaiting", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;
  
  const countQuery = `
  SELECT COUNT(*) AS totalCount
  FROM recipes
  WHERE status = 'awaits'
 `;


  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.sendDate, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId
    FROM recipes
    WHERE status = 'awaits'
    ORDER BY sendDate DESC
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
        return res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/user-favorites", (req, res) => {
  const userId = Number(req.query.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;


  
  const countQuery = `
  SELECT COUNT(*) AS totalCount
  FROM recipes
  WHERE status = 'public'
    AND id IN (
      SELECT recipeId
      FROM \`recipes-favorites\`
      WHERE userId = ${userId}
    );
 `;


  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
      COUNT(favorites.recipeId) AS favoritesCount
    FROM recipes
    LEFT JOIN \`recipes-favorites\` AS favorites ON recipes.id = favorites.recipeId
    WHERE status = 'public' AND favorites.userId = ${userId}  
    GROUP BY recipes.id
    ORDER BY favoritesCount DESC
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
        return res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/search/liked/:userId", (req, res) => {
    const userId = Number(req.params.userId);

  const searchText = req.query.search; 

  const selectQuery = `
       SELECT 
      recipes.id, 
      recipes.name,
      COUNT(likes.recipeId) AS likesCount
    FROM recipes
    LEFT JOIN \`recipes-likes\` AS likes ON recipes.id = likes.recipeId
    WHERE status = 'public' AND likes.userId = ${userId}  AND name LIKE ? 
    GROUP BY recipes.id
    ORDER BY likesCount DESC
 `;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/ingredients/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);
  const query = `
    select name, quantity, unit 
    from \`recipes-ingredients\` 
    where recipeId = ?
 `;
  
    connection.query(query, [recipeId] ,(error, results, fields) => {
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

router.get("/user-liked", (req, res) => {
  const userId = Number(req.query.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
      SELECT COUNT(*) AS totalCount
  FROM recipes
  WHERE status = 'public'
    AND id IN (
      SELECT recipeId
      FROM \`recipes-likes\`
      WHERE userId = ${userId}
    );

  `;

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
      COUNT(likes.recipeId) AS likesCount
    FROM recipes
    LEFT JOIN \`recipes-likes\` AS likes ON recipes.id = likes.recipeId
    WHERE status = 'public' AND likes.userId = ${userId}  
    GROUP BY recipes.id
    ORDER BY likesCount DESC
    LIMIT ${startIndex}, ${limit};
 `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/search/commented/:userId", (req, res) => {
    const userId = Number(req.params.userId);

  const searchText = req.query.search; 

  const selectQuery = `
SELECT 
      recipes.id, 
      recipes.name,
      COUNT(comments.recipeId) AS commentsCount
    FROM recipes
    LEFT JOIN comments ON recipes.id = comments.recipeId
    WHERE status = 'public' AND comments.authorId = ${userId}   AND name LIKE ?
    GROUP BY recipes.id
    ORDER BY commentsCount DESC
 `;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/user-comments", (req, res) => {
  const userId = Number(req.query.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

const countQuery = `
  SELECT COUNT(*) AS totalCount
  FROM recipes
  WHERE status = 'public'
    AND id IN (
      SELECT recipeId
      FROM comments
      WHERE authorId = ${userId}
    );
`;

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
      COUNT(comments.recipeId) AS commentsCount
    FROM recipes
    LEFT JOIN comments ON recipes.id = comments.recipeId
    WHERE status = 'public' AND comments.authorId = ${userId}  
    GROUP BY recipes.id
    ORDER BY commentsCount DESC
    LIMIT ${startIndex}, ${limit};
`;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});


router.get("/search/planned/:userId", (req, res) => {
    const userId = Number(req.params.userId);

  const searchText = req.query.search; 

  const selectQuery = `
SELECT 
  recipes.id, 
  recipes.name
 FROM recipes
 JOIN calendarevents AS calendar ON recipes.id = calendar.recipeId
 WHERE calendar.userId = ${userId} AND name LIKE ?
 `;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/user-planned", (req, res) => {
  const userId = Number(req.query.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE id IN (
      SELECT recipeId
      FROM calendarevents
      WHERE userId = ${userId}
    );
  `;

  

  const selectQuery = `
    SELECT 
  recipes.id, 
  recipes.name, 
  recipes.mainImage,
  recipes.authorId,
  recipes.status
 FROM recipes
 JOIN calendarevents AS calendar ON recipes.id = calendar.recipeId
 WHERE calendar.userId = ${userId}
    LIMIT ${startIndex}, ${limit};
 `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/search/following/:userId", (req, res) => {
    const userId = Number(req.params.userId);

  const searchText = req.query.search; 

  const selectQuery = `
SELECT 
  recipes.id, 
  recipes.name
 FROM recipes
 JOIN followers ON recipes.authorId = followers.following 
 WHERE followers.follower = ${userId} AND name LIKE ?
 ORDER BY recipes.sendDate DESC
 `;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

router.get("/followed", (req, res) => {
  const userId = Number(req.query.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
  SELECT COUNT(*) AS totalCount
  FROM recipes
  WHERE status = 'public'
    AND authorId IN (
      SELECT following
      FROM followers
      WHERE follower = ${userId}
    );
 `;


  const selectQuery = `
    SELECT 
  recipes.id, 
  recipes.name, 
  recipes.mainImage,
  recipes.authorId,
  recipes.status
 FROM recipes
 JOIN followers ON recipes.authorId = followers.following 
 WHERE followers.follower = ${userId} and status ='public'
 ORDER BY recipes.sendDate DESC
    LIMIT ${startIndex}, ${limit};
 `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/search/cooked/:userId", (req, res) => {
    const userId = Number(req.params.userId);

  const searchText = req.query.search; 

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name,
      COUNT(cooks.recipeId) AS cooksCount
    FROM recipes
    LEFT JOIN \`recipes-cooks\` AS cooks ON recipes.id = cooks.recipeId
    WHERE status = 'public' AND cooks.userId = ${userId}   AND name LIKE ?
    GROUP BY recipes.id
    ORDER BY cooksCount DESC

 `;

  connection.query(selectQuery, [`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});


router.get("/user-cooked", (req, res) => {
  const userId = Number(req.query.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
  SELECT COUNT(*) AS totalCount
  FROM recipes
  WHERE status = 'public'
    AND id IN (
      SELECT recipeId
      FROM \`recipes-cooks\`
      WHERE userId = ${userId}
    );
  `;

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
      COUNT(cooks.recipeId) AS cooksCount
    FROM recipes
    LEFT JOIN \`recipes-cooks\` AS cooks ON recipes.id = cooks.recipeId
    WHERE status = 'public' AND cooks.userId = ${userId}  
    GROUP BY recipes.id
    ORDER BY cooksCount DESC
    LIMIT ${startIndex}, ${limit};
    `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});



router.get("/most-favorite", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE status = 'public'
  `;

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
      COUNT(favorites.recipeId) AS favoritesCount
    FROM recipes
    LEFT JOIN \`recipes-favorites\` AS favorites ON recipes.id = favorites.recipeId
    WHERE status = 'public'
    GROUP BY recipes.id
    ORDER BY favoritesCount DESC
    LIMIT ${startIndex}, ${limit};
    `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/most-commented", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
  SELECT COUNT(*) AS totalCount
  FROM recipes
  WHERE status = 'public'
    AND recipes.id IN (
      SELECT recipeId
      FROM \`comments\`
      GROUP BY recipeId
      HAVING COUNT(*) >= 1
    );
  `;

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
      COUNT(comments.recipeId) AS commentsCount
    FROM recipes
    LEFT JOIN \`comments\` AS comments ON recipes.id = comments.recipeId
    WHERE status = 'public'
    GROUP BY recipes.id
    HAVING commentsCount >= 1  -- Только рецепты с минимум 1 комментарием
    ORDER BY commentsCount DESC
    LIMIT ${startIndex}, ${limit};
    `;

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/most-recent", (req, res) => {
  const page = req.query.page;
  const except = req.query.except;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  let countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE status = 'public'
  `;


  if (except) {
      countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE status = 'public'
    AND id != ${except}
  `;
  }



  let selectQuery = `
      SELECT 
      id, 
      name, 
      mainImage,
      authorId,
      status,
      sendDate
    FROM recipes
    WHERE status = 'public'
    ORDER BY sendDate DESC
    LIMIT ${startIndex}, ${limit};
 `;
  
  if (except) {
     selectQuery = `
      SELECT 
      id, 
      name, 
      mainImage,
      authorId,
      status,
      sendDate
    FROM recipes
    WHERE status = 'public'
    AND id != ${except}
    ORDER BY sendDate DESC
    LIMIT ${startIndex}, ${limit};
 `;
  }

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
        res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.delete("/likes/:recipeId/:userId", (req, res) => {
  const recipeId = req.params.recipeId;
  const userId = req.params.userId;

  const deleteQuery = `
    DELETE FROM \`recipes-likes\`
    WHERE recipeId = ? AND userId = ?;
  `;

  connection.query(
    deleteQuery,
    [recipeId, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при удалении лайка" });
      } else {
        res.status(200).json({ success: true, message: "Лайк успешно удален" });
      }
    }
  );
});


router.post("/ingredient/:recipeId", (req, res) => {
  const { name, unit, quantity } = req.body;
  const recipeId = req.params.recipeId;

  const query = `
    INSERT INTO \`recipes-ingredients\` (recipeId, name, unit, quantity)
    VALUES (?, ?, ?, ?);
  `;

  connection.query(
    query,
    [recipeId, name, unit, quantity],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {
        res
          .status(200)
          .json({ info: "Ингредиент рецепта успешно записан" });
      }
    }
  );
});

router.post("/likes/:recipeId/:userId", (req, res) => {
  const recipeId = req.params.recipeId;
  const userId = req.params.userId;

  const insertQuery = `
    INSERT INTO \`recipes-likes\` (recipeId, userId)
    VALUES (?, ?);
  `;

  connection.query(
    insertQuery,
    [recipeId, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {
        res
          .status(200)
          .json({ success: true, message: "Лайк успешно добавлен" });
      }
    }
  );
});

router.delete("/favorites/:recipeId/:userId", (req, res) => {
  const recipeId = req.params.recipeId;
  const userId = req.params.userId;

  const deleteQuery = `
    DELETE FROM \`recipes-favorites\`
    WHERE recipeId = ? AND userId = ?;
  `;

  connection.query(
    deleteQuery,
    [recipeId, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при удалении лайка" });
      } else {
        res.status(200).json({ success: true, message: "Лайк успешно удален" });
      }
    }
  );
});

router.post("/favorites/:recipeId/:userId", (req, res) => {
  const recipeId = req.params.recipeId;
  const userId = req.params.userId;

  const insertQuery = `
    INSERT INTO \`recipes-favorites\` (recipeId, userId)
    VALUES (?, ?);
  `;

  connection.query(
    insertQuery,
    [recipeId, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {
        res
          .status(200)
          .json({ success: true, message: "Лайк успешно добавлен" });
      }
    }
  );
});

router.delete("/cooks/:recipeId/:userId", (req, res) => {
  const recipeId = req.params.recipeId;
  const userId = req.params.userId;

  const deleteQuery = `
    DELETE FROM \`recipes-cooks\`
    WHERE recipeId = ? AND userId = ?;
  `;

  connection.query(
    deleteQuery,
    [recipeId, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при удалении лайка" });
      } else {
        res.status(200).json({ success: true, message: "Лайк успешно удален" });
      }
    }
  );
});

router.post("/votes/:recipeId/:userId/:vote", (req, res) => {
  const recipeId = Number(req.params.recipeId);
  const userId = Number(req.params.userId);
  const vote = Number(req.params.vote);

  const insertQuery = `
    INSERT INTO \`recipes-votes\` (recipeId, userId, vote)
    VALUES (?, ?, ?);
  `;

  connection.query(
    insertQuery,
    [recipeId, userId, vote],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {
        res
          .status(200)
          .json({ success: true, message: "Лайк успешно добавлен" });
      }
    }
  );
});

router.delete("/votes/:recipeId/:userId", (req, res) => {
  const recipeId = req.params.recipeId;
  const userId = req.params.userId;

  const deleteQuery = `
    DELETE FROM \`recipes-votes\`
    WHERE recipeId = ? AND userId = ?;
  `;

  connection.query(
    deleteQuery,
    [recipeId, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при удалении лайка" });
      } else {
        res.status(200).json({ success: true, message: "Лайк успешно удален" });
      }
    }
  );
});

router.post("/cooks/:recipeId/:userId", (req, res) => {
  const recipeId = req.params.recipeId;
  const userId = req.params.userId;

  const insertQuery = `
    INSERT INTO \`recipes-cooks\` (recipeId, userId)
    VALUES (?, ?);
  `;

  connection.query(
    insertQuery,
    [recipeId, userId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {
        res
          .status(200)
          .json({ success: true, message: "Лайк успешно добавлен" });
      }
    }
  );
});

module.exports = router;
