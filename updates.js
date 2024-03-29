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


router.put('/:updateId/publish', (req, res) => {
  const updateId = Number(req.params.updateId);
  
  const updateRoleQuery = "UPDATE updates SET status = 'public', sendDate = ? WHERE id = ?";

  connection.query(updateRoleQuery, [new Date(), updateId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res.status(500).json({ error: "Ошибка при обновлении роли категории в базе данных" });
    } else {
      res.status(200).json({ message: "Роль категории успешно обновлена на public" });
    }
  });
  
});

router.get('/awaits-count', (req, res) => {
  const query = `SELECT COUNT(*) AS count FROM updates  WHERE status = 'awaits'`;
  connection.query(query, (error, results, fields) => {
    if (error) {
      console.error(error);
      res.status(500).json({error:'Ошибка при попытке получить количество ожидающих обновлений'})
    }
    else {
      res.status(200).json(results);
    }
  })


})

router.get("/public", (req, res) => {
    const page = req.query.page;
  const limit = req.query.limit || 2;

    const startIndex = page * limit;

    let countQuery = `SELECT COUNT(*) AS totalCount FROM updates WHERE status = 'awaits' `;

  const selectQuery =  `SELECT * FROM updates WHERE status = 'awaits' ORDER BY sendDate DESC LIMIT ${startIndex}, ${limit}`;
  
  connection.query(countQuery, (error, countResults, fields) => {

          const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json({results:results, count:totalCount});
      }
    });
  })
});

router.get("/", (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit || 2;
  const role = req.query.role;
  const tag = req.query.tag;
  const state = req.query.state;
  const startIndex = page * limit;

  let countQuery = `SELECT COUNT(*) AS totalCount
  FROM updates
  WHERE status = 'public'
    AND context = 'all'`;

  let selectQuery = `SELECT * FROM updates
  WHERE status = 'public'
    AND context = 'all'`;

  if (role !== 'user') {

    countQuery = `SELECT COUNT(*) AS totalCount
    FROM updates
    WHERE status = 'public'`;

    selectQuery = `SELECT * FROM updates
    WHERE status = 'public'`;

  }

  if (state) {
    selectQuery += ` AND state = '${state}'`;
    countQuery += ` AND state = '${state}'`

  }

  if (tag) {
    selectQuery += ` AND JSON_CONTAINS(tags, '"${tag}"', '$')`;
    countQuery += ` AND JSON_CONTAINS(tags, '"${tag}"', '$')`
  }

  selectQuery += `
  ORDER BY sendDate DESC
  LIMIT ${startIndex}, ${limit}`

 

  connection.query(countQuery, (countError, countResults) => {

    
      const totalCount = countResults[0].totalCount;

    connection.query(selectQuery, (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ error: "Ошибка при получении данных из базы данных" });
      } else {
        res.status(200).json({results: results, count: totalCount});
      }
    });
  
  })
}
  );

router.post("/", (req, res) => {
  const { fullName, authorId, status, description, tags, shortName, link, state, notify, context } = req.body;

  if (!fullName || !authorId) {
    return res
      .status(400)
      .json({ info: "Недостаточно данных для добавления" });
  }

  const insertQuery =
    "INSERT INTO updates (fullName, sendDate, authorId, status, description, tags, shortName, link, state, notify, context) VALUES (?, now(), ?,?,?,?,?,?,?,?,?)";

  connection.query(
    insertQuery,
    [fullName, authorId, status, description, JSON.stringify(tags), shortName, link, state, notify, context],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ info: "Ошибка при выполнении запроса к базе данных" });
      } else {
        const insertedSectionId = results.insertId;

        res.status(201).json({ id: insertedSectionId });
      }
    }
  );
});


router.get("/tags", (req, res) => {
  const searchText = req.query.search;
  const selectQuery = `
  SELECT distinct tag
  FROM updates,
     JSON_TABLE(tags, '$[*]' COLUMNS (
         tag VARCHAR(100) PATH '$'
     )) AS jt
  WHERE status = 'public' AND tag LIKE ?
  ORDER BY tag
  LIMIT 10`;

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

        const tags = results.map(result => result.tag);
        res.status(200).json(tags);
      }
    }
  );
});


router.put("/state/:updateId", (req, res) => {
  const updateId = Number(req.params.updateId);
  const { state } = req.body;

  if (!updateId || !state) {
            res.status(404).json({info:'Нет данных'});

  }

  const updateQuery =
    "UPDATE updates SET state = ? WHERE id = ?";

  connection.query(
    updateQuery,
    [state, updateId],
    (error, results, fields) => {
      if (error) {
        console.error("Ошибка при выполнении запроса:", error);
        res
          .status(500)
          .json({ info: "Ошибка при выполнении запроса к базе данных" });
      } else {
        res.status(201).json({response:'Состояние новости успешно обновлены'});
      }
    }
  );
});

router.delete("/:updateId", (req, res) => {
  const updateId = req.params.updateId;

  const deleteQuery = "DELETE FROM updates WHERE id = ?";

  connection.query(deleteQuery, [updateId], (error, results, fields) => {
    if (error) {
      console.error("Ошибка при выполнении запроса:", error);
      res
        .status(500)
        .json({ error: "Ошибка при удалении секции из базы данных" });
    } else {
      res.status(200).json({ message: "Секция успешно удалена" });
    }
  });
});



module.exports = router;
