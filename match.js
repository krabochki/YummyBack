const express = require("express");
const bodyParser = require("body-parser");

const router = express.Router();

const cors = require("cors");

const corsOptions = {
  origin: true,
  credentials: true,
};

const connection = require("./db");

router.use(cors(corsOptions));
router.use(bodyParser.json());


router.get("/search-ingredients/:userId", (req, res) => {
  const searchText = req.query.search; 
  const userId = Number(req.params.userId);

  const selectQuery =
    `
    SELECT ri.name from \`recipes-ingredients\` ri
    INNER JOIN recipes r ON r.id = ri.recipeId
    WHERE (r.status ='public' OR r.authorId = ?) AND ri.name like ?
    group by ri.name
    
    `

      connection.query(selectQuery, [userId,`%${searchText}%`], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      res.status(200).json(results);
    }
  });
});


router.get("/ingredients/:userId", (req, res) => {
  const limit = req.query.limit;
  const userId = Number(req.params.userId);
  const query =
    `
    SELECT ri.name, count(*) as count from \`recipes-ingredients\` ri
    INNER JOIN recipes r ON r.id = ri.recipeId
    WHERE (r.status ='public' OR r.authorId = ?)
    group by ri.name
    order by count desc
    ${limit?`LIMIT ${limit}`:''};
    `

  connection.query(query, [userId], (error, results, fields) => {
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


router.get('/recipes/:userId', (req, res) => {
  const excludedIngredients = req.query.excludedIngredients || '';
  const includedIngredients = req.query.includedIngredients || '';
  const excludedIngredientsArray = excludedIngredients.split(',');
  const includedIngredientsArray = includedIngredients.split(',');
  const includedIngredientsArrayLength = includedIngredientsArray.length;
  const userId = Number(req.params.userId); 

  const query =
    `
    SELECT distinct
      r.id,
      r.name,
      r.status,
    COALESCE(likesCount, 0) AS likesCount,
    COALESCE(cooksCount, 0) AS cooksCount
    FROM
      recipes r
    LEFT JOIN (
    SELECT 
        recipeId,
        COUNT(*) AS likesCount
    FROM 
        \`recipes-likes\`
    GROUP BY 
        recipeId
) AS likes ON r.id = likes.recipeId
LEFT JOIN (
    SELECT 
        recipeId,
        COUNT(*) AS cooksCount
    FROM 
        \`recipes-cooks\`
    GROUP BY 
        recipeId
) AS cooks ON r.id = cooks.recipeId

    WHERE
      r.id IN (
        SELECT recipeId
        FROM \`recipes-ingredients\`
        WHERE name IN (?) AND name not in (?)
        GROUP BY recipeId
        HAVING COUNT(DISTINCT name) = ${includedIngredientsArrayLength})
    AND (status = 'public' OR authorId = ?)
    GROUP BY r.id
    ORDER BY likesCount DESC, cooksCount DESC, r.name
    `

  connection.query(query, [includedIngredientsArray, excludedIngredientsArray, userId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при получении данных из базы данных" });
    } else {
      console.table(results);
      res.status(200).json(results);
    }
  });
  
});



module.exports = router;
