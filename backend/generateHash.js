const bcrypt = require('bcryptjs');
const password = '';

bcrypt.hash(password, 10, function(err, hash) {
  if (err) {
    console.error("Ошибка хеширования:", err);
  } else {
    console.log("Скопируйте этот хэш для ADMIN_PASSWORD_HASH:");
    console.log(hash);
  }
});