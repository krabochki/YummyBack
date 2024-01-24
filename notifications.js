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
router.use(bodyParser.json())

router.post('/', (req, res) => {
  const {
    read,
    type,
    title,
    context,
    message,
    sendDate,
    relatedLink,
    relatedId,
    userId,
    } = req.body;
    



  if (!userId) {
    return res.status(400).json({ error: 'Недостаточно данных для создания уведомления' });
  }

  const query = 'INSERT INTO notifications (`read`, type, title, `context`, message, sendDate, link, relatedId, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
  
  connection.query(
    query,
    [read, type, title, context, message, sendDate, relatedLink, relatedId || null, userId],
    (error, results, fields) => {
      if (error) {
        console.error('Ошибка при выполнении запроса:', error);
        res.status(500).json({ error: 'Ошибка при выполнении запроса к базе данных' });
      } else {
        res.status(201).json({ success: true, message: 'Уведомление успешно добавлено' });
      }
    }
  );
});

router.delete('/:userId', (req, res) => {
  const userId = req.params.userId;


  const query =  `DELETE FROM notifications WHERE (userId = ? AND context NOT IN ('plan-reminder', 'plan-reminder-start'))`;

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error('Ошибка при выполнении запроса:', error);
      res.status(500).json({ error: 'Ошибка при выполнении запроса к базе данных' });
    } else {
      res.status(200).json({ message: 'Уведомления успешно удалены' });
    }
  });
});

router.get('/:userId', (req, res) => {
  const userId = req.params.userId;

  const query = 'SELECT * FROM notifications WHERE userId = ?';

  connection.query(query, [userId], (error, results, fields) => {
    if (error) {
      console.error('Ошибка при выполнении запроса:', error);
      res.status(500).json({ error: 'Ошибка при выполнении запроса к базе данных' });
    } else {
      res.status(200).json(results);
    }
  });
});

router.put('/:userId/mark-read', (req, res) => {
  const userId = Number(req.params.userId);

  const updateQuery = 'UPDATE notifications SET `read` = 1 WHERE userId = ?';

  connection.query(updateQuery, [userId], (error, results, fields) => {
    if (error) {
      console.error('Ошибка при выполнении запроса:', error);
      res.status(500).json({ error: 'Ошибка при выполнении запроса к базе данных' });
    } else {
      res.status(200).json({ message: 'Все уведомления пользователя отмечены как прочитанные' });
    }
  });
});

router.delete('/notifications/:notificationId', (req, res) => {
  const notificationId = Number(req.params.notificationId);

  const deleteQuery = 'DELETE FROM notifications WHERE id = ?';

  connection.query(deleteQuery, [notificationId], (error, results, fields) => {
    if (error) {
      console.error('Ошибка при выполнении запроса:', error);
      res.status(500).json({ error: 'Ошибка при выполнении запроса к базе данных' });
    } else {
      res.status(200).json({ message: 'Уведомление успешно удалено' });
    }
  });
});


router.put('/notifications/:notificationId/mark-read', (req, res) => {
  const notificationId = Number(req.params.notificationId);

  const updateQuery = 'UPDATE notifications SET `read` = 1 WHERE id = ?';

  connection.query(updateQuery, [notificationId], (error, results, fields) => {
    if (error) {
      console.error('Ошибка при выполнении запроса:', error);
      res.status(500).json({ error: 'Ошибка при выполнении запроса к базе данных' });
    } else {
      res.status(200).json({ message: 'Уведомление отмечено как прочитанное' });
    }
  });
});


module.exports = router; 