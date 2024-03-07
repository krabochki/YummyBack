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
  destination: "images/ingredients/",
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

router.get("/ingredient/:id", (req, res) => {
  const id = Number(req.params.id);
  const query = "SELECT id, name, status FROM ingredients WHERE id = ?";

  connection.query(query, [id], (error, results, fields) => {
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

router.get("/variations/:id", (req, res) => {
  const id = Number(req.params.id);
  const query =
    "SELECT variation FROM `ingredients-variations` WHERE ingredientId = ?";

  connection.query(query, [id], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const variationsArray = results.map((result) => result.variation);
      res.status(200).json(variationsArray);
    }
  });
});

router.get("/products/:ingredientId/:userId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);
  const userId = Number(req.params.userId);
  const query = `SELECT DISTINCT p.*
     FROM products p
     LEFT JOIN ingredients i ON p.name LIKE CONCAT('%', i.name, '%')
     LEFT JOIN \`ingredients-variations\` iv ON (p.name LIKE CONCAT('%', iv.variation, '%')
        AND iv.ingredientId = ?) OR p.name LIKE CONCAT('%', iv.variation, '%')
     WHERE ((i.id IS NOT NULL AND i.id = ?)
        OR (iv.ingredientId IS NOT NULL AND iv.ingredientId = ?)) AND p.userId = ?`;

  connection.query(query, [ingredientId, ingredientId, ingredientId, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const hasRows = results.length > 0;
      res.status(200).json({ hasRows });
    }
  });
});

router.get("/full-ingredient/:ingredientId/:userId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);
  const userId = Number(req.params.userId);
  const query = `    
  SELECT 
      i.id,
      i.image,
      i.name, 
      i.history, 
      i.description, 
      i.advantages, 
      i.disadvantages, 
      i.origin, 
      i.status,
      i.nutritions,
      i.precautions, 
      i.tips,
      i.recommendations as recommendedTo,
      i.contraindicates as contraindicatedTo,
      i.compatibleDishes,
      i.cookingMethods,
      i.storageMethods, 
      i.externalLinks,
      i.shoppingListGroup,
      (
        SELECT COUNT(DISTINCT ri.recipeId)
        FROM \`recipes-ingredients\` ri
        JOIN recipes r ON ri.recipeId = r.id
        WHERE (r.status = 'public' OR r.authorId = ?) 
        AND
        (
          ri.name LIKE CONCAT('%',i.name,'%')
                    OR ri.name IN
          (
            SELECT variation
            FROM \`ingredients-variations\`
            WHERE ingredientId = i.id
          )
        )
      )
      AS recipesCount
    FROM ingredients i
    JOIN \`groups-ingredients\` gi ON i.id = gi.ingredientId
    WHERE i.id = ?
    `;

  connection.query(query, [userId, ingredientId], (error, results, fields) => {
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

router.get("/edit-ingredient/:ingredientId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);
  const query = `    
  SELECT 
      i.id,
      i.image,
      i.name, 
      i.history, 
      i.description, 
      i.advantages, 
      i.disadvantages, 
      i.origin, 
      i.status,
      i.nutritions,
      i.precautions, 
      i.tips,
      i.recommendations as recommendedTo,
      i.contraindicates as contraindicatedTo,
      i.compatibleDishes,
      i.cookingMethods,
      i.storageMethods, 
      i.externalLinks,
      i.shoppingListGroup
  FROM ingredients i
  WHERE i.id = ?
    `;

  connection.query(query, [ingredientId], (error, results, fields) => {
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






router.get("/related-ingredients/:ingredientId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);

  const query = `
    SELECT DISTINCT id,name FROM (
      (
        SELECT  i.id, i.name
        FROM ingredients i
        JOIN(
          SELECT distinct variation AS v 
          FROM \`ingredients-variations\` 
          WHERE ingredientId = ?) iv
          ON i.name like CONCAT('%', v,'%')
          where i.status='public'
          )
      UNION(
		    SELECT i.id, i.name from ingredients i

		    LEFT JOIN \`ingredients-variations\` iv ON i.id = iv.ingredientId
		    JOIN (
			    SELECT distinct variation AS v 
			    FROM \`ingredients-variations\` 
			    WHERE ingredientId = ?) iv
		      ON iv.variation like CONCAT('%', v,'%')
          where i.status='public'
          )
         
      UNION(
        SELECT i.id, i.name
        FROM ingredients i
        JOIN \`ingredients-variations\` iv ON i.id = iv.ingredientId
        WHERE   i.status='public' AND iv.variation LIKE CONCAT('%', (SELECT name FROM ingredients WHERE id = ?), '%')	
          OR (SELECT name FROM ingredients WHERE id = ?) LIKE CONCAT('%', iv.variation, '%')
      )
	    UNION(
		    SELECT i.id, i.name
        FROM ingredients i
        LEFT JOIN \`ingredients-variations\` iv ON i.id = iv.ingredientId
        WHERE
        i.status='public' AND
          i.name LIKE CONCAT('%', (SELECT name FROM ingredients WHERE id = ?), '%')
          OR (SELECT name FROM ingredients WHERE id =? ) LIKE CONCAT('%', i.name, '%')
          OR iv.variation LIKE CONCAT('%', (SELECT name FROM ingredients WHERE id = ?), '%')))
    AS result
    WHERE id != ?
    ORDER BY name, id
    LIMIT 8
  `;

  connection.query(query,
    Array(8).fill(ingredientId), 
    (error, results, fields) =>
    {
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



router.get("/related-categories/:ingredientId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);

  const query = `
    SELECT id, name
    FROM categories
    WHERE id IN (
      SELECT DISTINCT c.categoryId
      FROM \`recipes-categories\` c
      JOIN \`recipes-ingredients\` ri ON c.recipeId = ri.recipeId
      WHERE 
        ri.name LIKE concat('%',(
          SELECT name
          FROM ingredients
          WHERE id = ?),'%')
        OR 
          ri.name IN (
            SELECT variation
            FROM \`ingredients-variations\`
            WHERE ingredientId = ?))
    ORDER by name, id
    LIMIT 8
  `;

  connection.query(query,
    [ingredientId, ingredientId, ingredientId], 
    (error, results, fields) =>
    {
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

router.get("/by-group/:groupId/:userId", (req, res) => {
  const groupId = Number(req.params.groupId);
  const authorId = Number(req.params.userId) || 0;

  const selectQuery = `
    SELECT i.name, i.id, i.image,
      (SELECT COUNT(DISTINCT ri.recipeId)
      FROM \`recipes-ingredients\` ri
      JOIN recipes r ON ri.recipeId = r.id
      WHERE (r.status = 'public' OR r.authorId = ?) 
        AND (ri.name LIKE CONCAT('%',i.name,'%')  OR ri.name IN (SELECT variation FROM \`ingredients-variations\` WHERE ingredientId = i.id))) AS recipesCount
    FROM ingredients i
    JOIN \`groups-ingredients\` gi ON i.id = gi.ingredientId
    WHERE i.status = 'public' AND gi.groupId = ?
    GROUP BY i.id, i.name
    ORDER BY recipesCount DESC, i.name
    LIMIT 8;
  `;

  connection.query(selectQuery, [authorId, groupId], (error, results, fields) => {
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




router.get("/some-popular/:userId", (req, res) => {
  const authorId = Number(req.params.userId) || 0;
  const page = req.query.page || 0; // Установите значение по умолчанию на страницу 0, если не указано
  const limit = req.query.limit || 2;
  const startIndex = page * limit;

    const countQuery = `
    SELECT COUNT(*)  AS totalCount
    FROM (
        SELECT i.name, i.id, i.image,
          (SELECT COUNT(DISTINCT ri.recipeId)
          FROM \`recipes-ingredients\` ri
          JOIN recipes r ON ri.recipeId = r.id
            WHERE (r.status = 'public' OR r.authorId = ?) 
            AND (          ri.name LIKE CONCAT('%',i.name,'%')  OR ri.name IN (SELECT variation FROM \`ingredients-variations\` WHERE ingredientId = i.id)))
            AS recipesCount
        FROM ingredients i
        WHERE i.status = 'public'
        HAVING recipesCount > 0
    ) AS count;
    `;

  const selectQuery = `
    SELECT i.name, i.id, i.image,
      (SELECT COUNT(DISTINCT ri.recipeId)
      FROM \`recipes-ingredients\` ri
      JOIN recipes r ON ri.recipeId = r.id
        WHERE (r.status = 'public' OR r.authorId = ?) 
        AND (ri.name LIKE CONCAT('%',i.name,'%')
         OR ri.name IN (SELECT variation FROM \`ingredients-variations\` WHERE ingredientId = i.id)))
        AS recipesCount
    FROM ingredients i
    WHERE i.status = 'public'
    HAVING recipesCount > 0
    ORDER BY recipesCount DESC, i.name
    LIMIT ${startIndex}, ${limit};
  `;

  connection.query(countQuery, [authorId], (error, countResults, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      const totalCount = countResults[0].totalCount;

      connection.query(selectQuery, [authorId], (error, results, fields) => {
        if (error) {
          console.error("Ошибка при выполнении запроса:", error);
          res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
        } else {
          res.status(200).json({ results: results, count: totalCount });
        }
      });
    }
  });
});

router.get("/popular/:userId", (req, res) => {
  const authorId = Number(req.params.userId) || 0;

  const query = `
    SELECT i.name, i.id, i.image,
      (SELECT COUNT(DISTINCT ri.recipeId)
      FROM \`recipes-ingredients\` ri
      JOIN recipes r ON ri.recipeId = r.id
        WHERE (r.status = 'public' OR r.authorId = ?) 
        AND (          ri.name LIKE CONCAT('%',i.name,'%')  OR ri.name IN (SELECT variation FROM \`ingredients-variations\` WHERE ingredientId = i.id)))
        AS recipesCount
    FROM ingredients i
    WHERE i.status = 'public'
    HAVING recipesCount > 0
    ORDER BY recipesCount DESC, i.name
    LIMIT 8;
  `;

  connection.query(query, [authorId], (error, results, fields) => {
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


router.get("/groups/:id", (req, res) => {
  const id = Number(req.params.id);
  const query = `
    SELECT g.id, g.name
    FROM \`groups\` g
    JOIN \`groups-ingredients\` gi ON g.id = gi.groupId
    JOIN ingredients i ON i.id = gi.ingredientId
    WHERE i.id = ?;
  `;
  connection.query(query, [id], (error, results, fields) => {
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


router.put("/approve/:ingredientId", (req, res) => {
  const ingredientId = Number(req.params.ingredientId);

  const updateQuery = `UPDATE ingredients SET  status = 'public' WHERE id = ?`;

  connection.query(updateQuery, [ingredientId], (error, results, fields) => {
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
  FROM ingredients
  WHERE status = 'awaits'
 `;

  const selectQuery = `
    SELECT 
      i.id, 
      i.name,
      i.sendDate,
      i.author,
      i.image
    FROM ingredients i
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
        return res.status(200).json({ ingredients: results, count: totalCount });
      }
    });
  });
});


router.get("/awaits-count", (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM ingredients  WHERE status = 'awaits'`;
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
    advantages,
    history,
    disadvantages,
    origin,
    precautions,
    tips,
    nutritions,
    recommendations,
    contraindicates,
    compatibleDishes,
    cookingMethods,
    storageMethods,
    externalLinks,
    shoppingListGroup,
    status,
  } = req.body;

  advantages = JSON.stringify(advantages);
  disadvantages = JSON.stringify(disadvantages);
  recommendations = JSON.stringify(recommendations);
  contraindicates = JSON.stringify(contraindicates);
  cookingMethods = JSON.stringify(cookingMethods);
  compatibleDishes = JSON.stringify(compatibleDishes);
  storageMethods = JSON.stringify(storageMethods);
  externalLinks = JSON.stringify(externalLinks);
  precautions = JSON.stringify(precautions);
  nutritions = JSON.stringify(nutritions);
  tips = JSON.stringify(tips);


  if (!name || !author) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для добавления ингредиента" });
  }

  const insertQuery =
    "INSERT INTO ingredients (name, image, nutritions, sendDate, author, description, history, advantages, disadvantages, origin, precautions, tips, recommendations, contraindicates, compatibleDishes, cookingMethods, storageMethods, externalLinks, shoppingListGroup, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)";

  connection.query(
    insertQuery,
    [
      name,
      image,
      nutritions,
      new Date(sendDate),
      author,
      description,
      history,
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

router.delete("/variations/:ingredientId", (req, res) => {
  const ingredientId = req.params.ingredientId;

  const deleteQuery = "DELETE FROM `ingredients-variations` WHERE ingredientId = ?";

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



router.delete("/products/:ingredientId/:userId", (req, res) => {
  const ingredientId = req.params.ingredientId;
  const userId = req.params.userId;
  const query =
  `DELETE p
   FROM products p
   LEFT JOIN ingredients i ON p.name LIKE CONCAT('%', i.name, '%')
   LEFT JOIN \`ingredients-variations\` iv ON
    (p.name LIKE CONCAT('%', iv.variation, '%') AND iv.ingredientId = ?)
      OR p.name LIKE CONCAT('%', iv.variation, '%')
   WHERE ((i.id IS NOT NULL AND i.id = ?)
      OR (iv.ingredientId IS NOT NULL AND iv.ingredientId = ?))
      AND p.userId = ?`;

  connection.query(query, [ingredientId, ingredientId, ingredientId, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при удалении ингредиента из базы данных" });
    } else {
      res.status(200).json({ message: "Продукты успешно удалены" });
    }
  });
});


router.post("/variation", (req, res) => {
  let { ingredientId, variation } = req.body;

  const query = `INSERT INTO \`ingredients-variations\` (ingredientId, variation) VALUES (?, ?)`;

  connection.query(
    query,
    [ingredientId, variation],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ info: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res.status(201).json({ info: "Вариация успешно добавлена" });
      }
    }
  );
});

router.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "\\images\\ingredients", filename); // Путь к папке, где хранятся файлы

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Если файл не найден, отправляем 404
    res.status(404).send("File not found");
  }
});

router.delete("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "\\images\\ingredients", filename);
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
    advantages,
    disadvantages,
    origin,
    precautions,
    history,
    tips,
    recommendedTo,
    contraindicatedTo,
    compatibleDishes,
    cookingMethods,
    storageMethods,
    externalLinks,
    nutritions,
    shoppingListGroup,
  } = req.body;


  advantages = JSON.stringify(advantages);
  disadvantages = JSON.stringify(disadvantages);
  recommendedTo = JSON.stringify(recommendedTo);
  contraindicatedTo = JSON.stringify(contraindicatedTo);
  cookingMethods = JSON.stringify(cookingMethods);
  compatibleDishes = JSON.stringify(compatibleDishes);
  storageMethods = JSON.stringify(storageMethods);
  externalLinks = JSON.stringify(externalLinks);
  precautions = JSON.stringify(precautions);
  tips = JSON.stringify(tips);
  nutritions = JSON.stringify(nutritions);


  const updateQuery =
    "UPDATE ingredients SET name = ?, image =?, description=?, history = ?, advantages=?, disadvantages=?, origin=?, precautions=?, tips=?, recommendations=?, contraindicates=?, compatibleDishes=?, cookingMethods=?, storageMethods=?, externalLinks=?, shoppingListGroup=?, nutritions = ? WHERE id = ?";

  connection.query(
    updateQuery,
    [
      name,
      image,
      description,
      history,
      advantages,
      disadvantages,
      origin,
      precautions,
      tips,
      recommendedTo,
      contraindicatedTo,
      compatibleDishes,
      cookingMethods,
      storageMethods,
      externalLinks,
      shoppingListGroup,
      nutritions,
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

  connection.query(
    updateRoleQuery,
    [ingredientId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({
            error: "Ошибка при обновлении роли ингредиента в базе данных",
          });
      } else {
        res
          .status(200)
          .json({ message: "Роль ингредиента успешно обновлена на public" });
      }
    }
  );
});

router.post("/image", upload.single("image"), (req, res) => {
  const imageFilename = req.file.filename;
  res.status(200).json({
    message: "Изображение секции успешно загружено",
    filename: imageFilename,
  });
});

router.get("/search", (req, res) => {
  const searchText = req.query.search; 

  const selectQuery =
    `
    SELECT DISTINCT i.id, i.name
    FROM ingredients i
    INNER JOIN \`groups-ingredients\` gi ON i.id = gi.ingredientId
    LEFT JOIN \`ingredients-variations\` iv ON i.id = iv.ingredientId
    WHERE (i.name LIKE ? OR ? LIKE concat('%',i.name,'%') OR iv.variation LIKE ?) AND i.status = 'public'`

      connection.query(selectQuery, [`%${searchText}%`,`%${searchText}%`,`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});

module.exports = router;
