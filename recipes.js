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
  destination: "images/recipes/", // папка, куда сохранять файлы
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // уникальное имя файла
  },
});

const upload = multer({ storage });

router.post("/image", upload.single("image"), (req, res) => {
  const imageFilename = req.file.filename;
  res.status(200).json({
    message: "Изображение успешно загружено",
    filename: imageFilename,
  });
});

router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "\\images\\recipes", filename); // Путь к папке, где хранятся файлы

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Если файл не найден, отправляем 404
    res.status(404).send("File not found");
  }
});

router.put("/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;

  let {
    name,
    mainImage,
    publicationDate,
    description,
    status,
    preparationTime,
    cookingTime,
    servings,
    origin,
    nutritions,
    history,
  } = req.body;

  nutritions = JSON.stringify(nutritions);

  if (!name) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для изменения рецепта" });
  }

  const insertQuery = `UPDATE  recipes SET  
    name= ?,
    mainImage=?,
    description=?,
    status=?,
    preparationTime=?,
    cookingTime=?,
    servings=?,
    origin=?,
    nutritions=?,
    history=? WHERE id = ?`;

  connection.query(
    insertQuery,
    [
      name,
      mainImage,
      description,
      status,
      preparationTime,
      cookingTime,
      servings,
      origin,
      nutritions,
      history,
      recipeId,
    ],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ info: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res.status(201).json({ message: "Рецепт успешно обновлен" });
      }
    }
  );
});

router.post("/", (req, res) => {
  let {
    name,
    mainImage,
    authorId,
    description,
    status,
    preparationTime,
    publicationDate,
    cookingTime,
    servings,
    origin,
    nutritions,
    history,
  } = req.body;

  nutritions = JSON.stringify(nutritions);

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
    history)
    VALUES
    (?,?,?,?,?,?,?,?,?,?,?,?)`;

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

router.put("/unset-category/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;
  const categoryId = req.body.id;

  const query =
    "DELETE FROM `recipes-categories` WHERE recipeId = ? AND categoryId = ?";

  connection.query(query, [recipeId, categoryId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при выполнении запроса к базе данных" });
    } else {
      res.status(200).json({
        message: `Успешно`,
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



router.get("/related-ingredients/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;
  const selectQuery = `

  WITH ingredient_lengths AS (
    SELECT 
        ri.name as rName,
        COALESCE(i.id, iv.ingredientId) AS matching_ingredient_id,
        COALESCE(i.name, iv.variation) AS ingredient_name,
        LENGTH(COALESCE(i.name, iv.variation)) AS name_length,
        ROW_NUMBER() OVER (PARTITION BY ri.name  ORDER BY LENGTH(COALESCE(i.name, iv.variation)) DESC) AS rn
    FROM 
                  \`recipes-ingredients\` ri

    LEFT JOIN 
        ingredients i ON ri.name LIKE CONCAT('%', i.name, '%') AND i.status = 'public'
    LEFT JOIN 
        \`ingredients-variations\` iv ON ri.name LIKE CONCAT('%', iv.variation, '%')
   WHERE 
        ri.recipeId = ?
)
SELECT 
rName as name,
    matching_ingredient_id as id, 
i.shoppingListGroup as groupId 
FROM 
    ingredient_lengths
   LEFT JOIN 
    ingredients i ON   i.id=matching_ingredient_id

WHERE 
    rn = 1 and id;

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
  const selectQuery = `SELECT id,name FROM recipes WHERE  authorId = ${userId} AND name LIKE ?`;

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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

router.get("/short-recipe/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);
  const selectQuery = `SELECT id,name FROM recipes WHERE  id = ?`;

  connection.query(selectQuery, recipeId, (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results[0]);
    }
  });
});

router.get("/edit-recipe/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);
  const selectQuery = `select id,name,description, preparationTime, cookingTime, servings,origin,nutritions, history, mainImage  from recipes WHERE  id = ?`;

  connection.query(selectQuery, recipeId, (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results[0]);
    }
  });
});

router.get("/search/public-and-my/:userId", (req, res) => {
  const userId = Number(req.params.userId);

  const searchText = req.query.search;
  const selectQuery = `SELECT id,name FROM recipes WHERE (status = 'public'  OR authorId = ${userId}) AND name LIKE ?`;

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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
  const categoryId = Number(req.params.categoryId);
  const userId = Number(req.params.userId);

  const searchText = req.query.search;
  const selectQuery = `
      SELECT 
      recipes.id, 
      recipes.name
      FROM recipes
      JOIN \`recipes-categories\` ON recipes.id = \`recipes-categories\`.recipeId
      
      WHERE \`recipes-categories\`.categoryId = ${categoryId} AND  name LIKE ? AND ( recipes.status = 'public' OR recipes.authorId = ${userId})
 `;

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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

router.get("/search/by-ingredient/:userId/:ingredientId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);
  const userId = Number(req.params.userId);
  const searchText = req.query.search;

  const selectQuery = `
      SELECT id, name
      FROM recipes
      WHERE id IN(
        SELECT DISTINCT recipeId FROM (
          SELECT DISTINCT i.id as ingredientId, r.id as recipeId 
          FROM ingredients i
          JOIN \`recipes-ingredients\` ri ON  ri.name LIKE CONCAT('%', i.name, '%')
          JOIN recipes r ON ri.recipeId = r.id
          WHERE  (r.status = 'public' OR r.authorId = ?) 
          OR ri.name IN (SELECT variation FROM \`ingredients-variations\` WHERE ingredientId = i.id)
          ) as q
        WHERE ingredientId = ?)
      AND name LIKE ? AND ( recipes.status = 'public' OR recipes.authorId = ?)
      ORDER BY name, id
 `;

  connection.query(
    selectQuery,
    [userId, ingredientId, `%${searchText}%`, userId],
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

router.get("/by-ingredient/:ingredientId/:userId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);
  const userId = Number(req.params.userId);
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
      SELECT 
      COUNT(*) AS totalCount
      FROM
      
      (

        SELECT r.id, r.name FROM recipes r WHERE (r.status = 'public' OR authorId = ?) AND id IN (
      SELECT ri.recipeId 
      FROM \`recipes-ingredients\`ri
      WHERE
        ri.name LIKE concat('%',(SELECT name FROM ingredients WHERE id = ?),'%') OR
        ri.name IN (
          SELECT iv.variation 
          FROM \`ingredients-variations\` iv 
          WHERE iv.ingredientId = ?))
      ) as q`;

  const selectQuery = `
      SELECT
        r.id,
        r.name,
        r.mainImage,
        r.authorId,
        r.status,
    COUNT(DISTINCT cooks.userId) AS cooksCount,
    COUNT(DISTINCT likes.userId) AS likesCount
      FROM recipes r
      LEFT JOIN \`recipes-likes\` AS likes ON r.id = likes.recipeId
      LEFT JOIN \`recipes-cooks\` AS cooks ON r.id = cooks.recipeId
      WHERE (r.status = 'public' OR r.authorId = ?) AND r.id IN (
        SELECT ri.recipeId 
        FROM \`recipes-ingredients\`ri
        WHERE
          ri.name LIKE concat('%',(SELECT i.name FROM ingredients i WHERE i.id = ?),'%') OR
          ri.name IN (
            SELECT iv.variation 
            FROM \`ingredients-variations\` iv 
            WHERE iv.ingredientId = ?))
                  GROUP by r.id

      ORDER by likesCount DESC, cooksCount DESC, r.name, r.id
      LIMIT ${startIndex}, ${limit};
 `;

  connection.query(
    countQuery,
    [userId, ingredientId, ingredientId],
    (error, countResults, fields) => {
      if (error) {
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      }

      const totalCount = countResults[0].totalCount;

      connection.query(
        selectQuery,
        [userId, ingredientId, ingredientId],
        (error, results, fields) => {
          if (error) {
            console.error("Ошибка при выполнении запроса:", error);
            res
              .status(500)
              .json({ error: "Ошибка при получении данных из базы данных" });
          } else {
            res.status(200).json({ recipes: results, count: totalCount });
          }
        }
      );
    }
  );
});

router.get("/by-category/:categoryId/:userId", (req, res) => {
  const categoryId = Number(req.params.categoryId);
  const userId = Number(req.params.userId);
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
      recipes.status,
    COUNT(DISTINCT cooks.userId) AS cooksCount,
    COUNT(DISTINCT likes.userId) AS likesCount

      FROM recipes
      JOIN \`recipes-categories\` ON recipes.id = \`recipes-categories\`.recipeId
    LEFT JOIN \`recipes-likes\` AS likes ON recipes.id = likes.recipeId
    LEFT JOIN \`recipes-cooks\` AS cooks ON recipes.id = cooks.recipeId
      WHERE \`recipes-categories\`.categoryId = ${categoryId} AND (recipes.status = 'public' OR recipes.authorId = ${userId})
      GROUP BY recipes.id
      ORDER by likesCount DESC,cooksCount DESC, recipes.name
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

router.get("/userpage/:userId/:currentUserId", (req, res) => {
  const userId = Number(req.params.userId);
  const currentUserId = Number(req.params.currentUserId);
  const authorMode = currentUserId === userId;
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `SELECT 
      COUNT(*) AS totalCount
      FROM (
        SELECT 
      r.id, 
      r.name,
      r.authorId,
      r.mainImage,
      r.status
      FROM recipes r
      WHERE authorId = ? ${authorMode ? "" : "AND r.status = 'public'"}
        ) as s`;

  const selectQuery = `
      SELECT 
      r.id, 
      r.name,       r.authorId,

      r.mainImage,
      r.status    ,  'no' as loadAuthor

      FROM recipes r
      WHERE authorId = ? ${authorMode ? "" : "AND r.status = 'public'"}
      ORDER by r.sendDate desc, r.name
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

router.get("/popular", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
      SELECT 
      recipes.id, 
      COUNT(likes.recipeId) AS likeCount
      FROM recipes
      LEFT JOIN \`recipes-likes\` AS likes ON recipes.id = likes.recipeId
      WHERE status = 'public'
      GROUP BY recipes.id
      HAVING likeCount > 0
    )
    AS q
  `;

  const selectQuery = `
    SELECT 
      recipes.id, 
      recipes.name, 
      recipes.mainImage,
      recipes.authorId,
      recipes.status,
    COUNT(DISTINCT cooks.userId) AS cookCount,
    COUNT(DISTINCT likes.userId) AS likeCount
    FROM recipes
    LEFT JOIN \`recipes-cooks\` AS cooks ON recipes.id = cooks.recipeId
    LEFT JOIN \`recipes-likes\` AS likes ON recipes.id = likes.recipeId
    WHERE status = 'public'
    GROUP BY recipes.id
    HAVING likeCount > 0
    ORDER BY likeCount DESC, cookCount DESC, name
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
      res.status(500).json({
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
    FROM (
    SELECT 
      recipes.id,
      COUNT(cooks.recipeId) AS cookCount
    FROM recipes
    LEFT JOIN \`recipes-cooks\` AS cooks ON recipes.id = cooks.recipeId
    WHERE status = 'public'
    GROUP BY recipes.id
    HAVING (cookCount > 0)
    ) as q
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
    HAVING (cookCount > 0)
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

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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

router.put("/make-awaits/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);

  const updateQuery = `UPDATE recipes SET sendDate = now() , status = 'awaits' WHERE id = ?`;

  connection.query(updateQuery, [recipeId], (error, results, fields) => {
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

router.put("/approve/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);

  const updateQuery = `UPDATE recipes SET sendDate = now() , status = 'public' WHERE id = ?`;

  connection.query(updateQuery, [recipeId], (error, results, fields) => {
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

  const updateRoleQuery = "UPDATE recipes SET status = 'private' WHERE id = ?";

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

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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

router.get("/ingredients/:recipeId", (req, res) => {
  const recipeId = Number(req.params.recipeId);
  const query = `
    select name, quantity, unit 
    from \`recipes-ingredients\` 
    where recipeId = ?
 `;

  connection.query(query, [recipeId], (error, results, fields) => {
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

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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

  connection.query(
    selectQuery,
    [`%${searchText}%`],
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
    FROM (SELECT 
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
        HAVING (favoritesCount > 0)) as q
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
        HAVING (favoritesCount > 0)

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
  const authorId = req.query.authorId;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  let countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM recipes
    WHERE status = 'public'
  `;

  if (except && authorId) {
    countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
      SELECT 
        id, 
        name, 
        mainImage,
        authorId,
        status,
        sendDate
      FROM 
        recipes
      WHERE 
        status = 'public' 
      AND  id != ${except} AND id NOT IN (
        SELECT id 
        FROM 
            (
              SELECT id
              FROM recipes
              WHERE 
                authorId = ${authorId} 
                AND status = 'public' 
                AND id !=  ${except}
              ORDER BY sendDate DESC
              LIMIT 4
            ) AS subquery
        )) as q
      
    
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

  if (except && authorId) {
    selectQuery = `
      SELECT 
        id, 
        name, 
        mainImage,
        authorId,
        status,
        sendDate
      FROM 
        recipes
      WHERE 
        status = 'public' 
      AND id NOT IN (
        SELECT id 
        FROM 
            (
              SELECT id
              FROM recipes
              WHERE 
                authorId = ${authorId} 
                AND status = 'public' 
                AND id !=  ${except}
              ORDER BY sendDate DESC
              LIMIT 4
            ) AS subquery
        )
      AND id != ${except}
      ORDER BY sendDate DESC
      LIMIT ${startIndex}, ${limit};
 `;
  }

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      return res.status(500).json({ error: error });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        return res.status(500).json({ error: error });
      } else {
        return res.status(200).json({ recipes: results, count: totalCount });
      }
    });
  });
});

router.get("/similar", (req, res) => {
  const page = req.query.page;
  const except = req.query.except;
  const authorId = req.query.authorId;
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

  const countQuery = `
    SELECT COUNT(*) AS totalCount
    FROM (
      select r.id,r.name from recipes r where id in(
      select recipeId from \`recipes-categories\` where categoryId in(
      select categoryId from \`recipes-categories\` where recipeId = ${except}) 
      AND recipeId != ${except})
      and id NOT IN (
              SELECT id 
              FROM 
                  (
                    SELECT id
                    FROM recipes
                    WHERE 
                      authorId =  ${authorId}
                      AND status = 'public' 
                      AND id != ${except}
                    ORDER BY sendDate DESC
                    LIMIT 4
                  ) AS subquery
              ) AND id not in(
              select id from
              (
              SELECT 
              id
            FROM 
              recipes
            WHERE 
              status = 'public' 
            AND id NOT IN (
              SELECT id 
              FROM 
                  (
                    SELECT id
                    FROM recipes
                    WHERE 
                      authorId = ${authorId}
                      AND status = 'public' 
                      AND id !=  ${except}
                    ORDER BY sendDate DESC
                    LIMIT 4
                  ) AS subquery
              )
            AND id != ${except}
            ORDER BY sendDate DESC
            LIMIT 3
              ) as sq
              )
    ) as sq
    
  `;

  const selectQuery = `
      select r.id,r.name, r.authorId, r.mainImage, r.status from recipes r where id in(
      select recipeId from \`recipes-categories\` where categoryId in(
      select categoryId from \`recipes-categories\` where recipeId = ${except}) 
      AND recipeId != ${except}) and r.status = 'public' 
      and id NOT IN (
              SELECT id 
              FROM 
                  (
                    SELECT id
                    FROM recipes
                    WHERE 
                      authorId =  ${authorId}
                      AND status = 'public' 
                      AND id != ${except}
                    ORDER BY sendDate DESC
                    LIMIT 4
                  ) AS subquery
              ) AND id not in(
              select id from
              (
              SELECT 
              id
            FROM 
              recipes
            WHERE 
              status = 'public' 
            AND id NOT IN (
              SELECT id 
              FROM 
                  (
                    SELECT id
                    FROM recipes
                    WHERE 
                      authorId = ${authorId}
                      AND status = 'public' 
                      AND id !=  ${except}
                    ORDER BY sendDate DESC
                    LIMIT 4
                  ) AS subquery
              )
            AND id != ${except}
            ORDER BY sendDate DESC
            LIMIT 3
              ) as sq
              )
      LIMIT ${startIndex}, ${limit};

 `;

  connection.query(countQuery, (error, countResults, fields) => {
    if (error) {
      return res.status(500).json({ error: error });
    }

    const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        return res.status(500).json({ error: error });
      } else {
        return res.status(200).json({ recipes: results, count: totalCount });
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

router.delete("/instruction/:instructionId", (req, res) => {
  const instructionId = req.params.instructionId;

  const query = `
    DELETE FROM recipes_instructions WHERE id = ?;
  `;

  connection.query(
    query,
    [instructionId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка" });
      } else {
        res.status(200).json({ info: "Успешно удалено" });
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
        res.status(200).json({ info: "Ингредиент рецепта успешно записан" });
      }
    }
  );
});

router.post("/instruction-image", (req, res) => {
  const { instructionId, filename } = req.body;

  const query = `
    INSERT INTO \`instructions_images\` (instructionId, image)
    VALUES (?, ?);
  `;

  connection.query(
    query,
    [instructionId, filename],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {
        res.status(200).json({ info: "Успешно записано" });
      }
    }
  );
});



router.post("/instruction", (req, res) => {
  const { recipeId, instruction } = req.body;

  if (!recipeId || !instruction) {
    return res.status(501).json({ error: "Нет данных" });
  }

  const query = `
    INSERT INTO recipes_instructions (recipeId, instruction)
    VALUES (?, ?);
  `;

  connection.query(
    query,
    [recipeId, instruction],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {        const id = results.insertId;

        res.status(201).json({ id: id });

      }
    }
  );
});


router.get("/instructions-images/:recipeId", (req, res) => {
    const recipeId = req.params.recipeId;

  if (!recipeId) {
    return res.status(501).json({ error: "Нет данных" });
  }

  const query = `
    select image, instructionId
    from instructions_images
    where instructionId in (
      select id 
      from recipes_instructions 
      where recipeId = ?);
  `;

  connection.query(
    query,
    [recipeId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});
router.get("/instruction-images/:instructionId", (req, res) => {
    const instructionId = req.params.instructionId;

  if (!instructionId) {
    return res.status(501).json({ error: "Нет данных" });
  }

  const query = `
    select image
    from instructions_images
    where instructionId =?
  `;

  connection.query(
    query,
    [instructionId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {const images = results.map((result) => result.image);
        res.status(200).json(images);
      }
    }
  );
});

router.get("/instructions/:recipeId", (req, res) => {
    const recipeId = req.params.recipeId;

  if (!recipeId) {
    return res.status(501).json({ error: "Нет данных" });
  }

  const query = `
    SELECT id, instruction as name FROM recipes_instructions WHERE recipeId = ?;
  `;

  connection.query(
    query,
    [recipeId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res.status(500).json({ error: "Ошибка при добавлении лайка" });
      } else {
        res.status(200).json(results);
      }
    }
  );
});


router.delete("/ingredients/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;

  const query = `
    DELETE FROM \`recipes-ingredients\` WHERE recipeId = ?
  `;

  connection.query(query, [recipeId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при добавлении лайка" });
    } else {
      res.status(200).json({ info: "Успешно" });
    }
  });
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

router.delete("/:recipeId", (req, res) => {
  const recipeId = req.params.recipeId;

  const query = `DELETE FROM recipes WHERE id = ?`;

  connection.query(query, [recipeId], (error, results, fields) => {
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

router.delete("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "\\images\\recipes", filename);
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
