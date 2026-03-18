const socket = io();

const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// Отображение сообщения (обычного или системного)
function addMessage(data, isSystem = false) {
    const messageDiv = document.createElement('div');
    if (isSystem) {
        messageDiv.className = 'system-message';
        messageDiv.textContent = data;
    } else {
        messageDiv.className = 'message';
        messageDiv.innerHTML = `
            <span class="username">${data.username}</span>
            <span class="timestamp">${data.timestamp}</span>
            <div class="text">${data.text}</div>
        `;
    }
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // автоскролл вниз
}

// Получение истории сообщений
socket.on('message history', (history) => {
    history.forEach(msg => addMessage(msg));
});

// Новое сообщение от сервера
socket.on('chat message', (msg) => {
    addMessage(msg);
});

// Пользователь присоединился
socket.on('user joined', (username) => {
    addMessage(`${username} присоединился к чату`, true);
});

// Пользователь покинул чат
socket.on('user left', (username) => {
    addMessage(`${username} покинул чат`, true);
});

// Отправка сообщения
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (messageInput.value.trim() !== '') {
        socket.emit('chat message', messageInput.value);
        messageInput.value = '';
    }
});
