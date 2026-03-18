const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Раздаём статические файлы из папки public
app.use(express.static('public'));

// Хранилище сообщений (в памяти)
let messages = [];

io.on('connection', (socket) => {
  console.log('New user connected');

  // Генерируем случайное имя пользователя
  const username = `User${Math.floor(Math.random() * 1000)}`;
  socket.username = username;

  // Отправляем историю сообщений новому пользователю
  socket.emit('message history', messages);

  // Уведомляем остальных о новом участнике
  socket.broadcast.emit('user joined', username);

  // Обработка входящего сообщения
  socket.on('chat message', (msg) => {
    const messageData = {
      username: socket.username,
      text: msg,
      timestamp: new Date().toLocaleTimeString()
    };
    messages.push(messageData);
    // Ограничиваем историю (последние 100 сообщений)
    if (messages.length > 100) messages.shift();

    // Рассылаем сообщение всем
    io.emit('chat message', messageData);
  });

  // Обработка отключения
  socket.on('disconnect', () => {
    console.log('User disconnected');
    io.emit('user left', socket.username);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
