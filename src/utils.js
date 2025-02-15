// Функція надсилання повідомлень
export async function sendMessage(TELEGRAM_API_URL, chatId, text, options = {}) {
	const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chat_id: chatId,
			text,
			...options,
		}),
	});
	const data = await response.json();
	return data.result;
}

// Функція для редагування повідомлень
export async function editTelegramMessage(TELEGRAM_API_URL, chatId, messageId, text, options = {}) {
	return fetch(`${TELEGRAM_API_URL}/editMessageText`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chat_id: chatId,
			message_id: messageId,
			text,
			...options,
		}),
	});
}

// Функція надсилання зображень
export async function sendPhoto(TELEGRAM_API_URL, chatId, photoUrl, caption = '') {
	return fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
	});
}

// Функція отримання файлу
export async function getFile(TELEGRAM_API_URL, fileId) {
	const response = await fetch(`${TELEGRAM_API_URL}/getFile?file_id=${fileId}`);
	const data = await response.json();
	return data.result;
}

// Функція для відправлення chatAction
export async function sendChatAction(TELEGRAM_API_URL, chatId, action) {
	const url = `${TELEGRAM_API_URL}/sendChatAction`;
	const body = {
		chat_id: chatId,
		action: action,
	};

	await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

// Функція для видалення повідомлення
export async function deleteMessage(TELEGRAM_API_URL, chatId, messageId) {
	try {
		await fetch(`${TELEGRAM_API_URL}/deleteMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				message_id: messageId,
			}),
		});
	} catch (error) {
		console.error('Не вдалося видалити повідомлення:', error);
	}
}

// Функція перевірки адмінів
export async function checkGroupAdmins(TELEGRAM_API_URL, chatID, allowedUsers) {
	try {
		const response = await fetch(`${TELEGRAM_API_URL}/getChatAdministrators?chat_id=${chatID}`);
		const data = await response.json();

		if (!data.ok) return false;

		const admins = data.result.map((admin) => admin.user.id);
		return allowedUsers.some((userID) => admins.includes(userID));
	} catch (error) {
		console.error('Помилка перевірки адмінів:', error);
		return false;
	}
}

// Функція збереження повідомлення
export async function saveMessage(db, userId, chatId, sender, text, mediaUrl = null) {
	if (mediaUrl) {
		await db
			.prepare('INSERT INTO messages (user_id, chat_id, sender, text, media_url) VALUES (?, ?, ?, ?, ?)')
			.bind(userId, chatId, sender, text, mediaUrl)
			.run();
	} else {
		await db.prepare('INSERT INTO messages (user_id, chat_id, sender, text) VALUES (?, ?, ?, ?)').bind(userId, chatId, sender, text).run();
	}
}
