require('module-alias/register')

const express = require('express');
const cors = require('cors');
const { sequelize } = require('@app/models');
const routes = require('@app/routes');

const app = express();
const port = process.env.PORT || 3000;
const isDevEnvironment = process.env.NODE_ENV === 'dev';

if (isDevEnvironment) {
  const corsOptions = {
    origin: "http://localhost:5173"
  };
  app.use(cors(corsOptions));
} else {
  const corsOptions = {
    origin: "http://localhost"
  };
  app.use(cors(corsOptions));
}

app.use(express.json());

// Используем все маршруты
if (isDevEnvironment) {
  app.use('/api/', routes);
} else {
  app.use('/', routes);
}

// Проверка подключения к БД и запуск сервера
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });