import { handleAddStreak, handleCheckStreaks, handleDeleteStreak } from './streaks';
import { saveUserData, getUserData, checkServicesAvailability } from './assistant';
import { sendMessage, saveMessage, deleteMessage } from './utils';

// Функція старту
export async function handleStartCommand(env, TELEGRAM_API_URL, message) {
	const chatId = message.chat.id;
	const command = 'start';
	const previousRecord = await env.DB.prepare('SELECT message_id FROM bot_messages WHERE chat_id = ? AND command = ?')
		.bind(chatId, command)
		.first();

	if (previousRecord && previousRecord.message_id) {
		try {
			await deleteMessage(TELEGRAM_API_URL, chatId, previousRecord.message_id);
		} catch (error) {
			console.error('Не вдалося видалити попереднє повідомлення для /start:', error);
		}
	}

	const userData = (await getUserData(env.DB, message.from.id)) || {};
	const userName = userData.first_name || 'користувач';
	const reply = `Привіт, ${userName}! 👋\nЯ твій помічник. Вибери команду нижче:`;

	const keyboard = {
		inline_keyboard: [
			[
				{ text: '🇺🇦 На ЗСУ', url: 'https://savelife.in.ua/projects/status/active/' },
				{ text: '❓ Допомога', callback_data: 'help' }
			]
		]
	};

	const sentMessage = await sendMessage(TELEGRAM_API_URL, chatId, reply, {
		reply_markup: JSON.stringify(keyboard)
	});

	await env.DB.prepare('INSERT OR REPLACE INTO bot_messages (chat_id, command, message_id) VALUES (?, ?, ?)')
		.bind(chatId, command, sentMessage.message_id)
		.run();

	await deleteMessage(TELEGRAM_API_URL, chatId, message.message_id);
}

// Функція для допомоги
export async function handleHelpCommand(env, TELEGRAM_API_URL, message) {
	const chatId = message.chat.id;
	const command = 'help';
	const previousRecord = await env.DB.prepare('SELECT message_id FROM bot_messages WHERE chat_id = ? AND command = ?')
		.bind(chatId, command)
		.first();

	if (previousRecord && previousRecord.message_id) {
		try {
			await deleteMessage(TELEGRAM_API_URL, chatId, previousRecord.message_id);
		} catch (error) {
			console.error('Не вдалося видалити попереднє повідомлення /help:', error);
		}
	}

	const keyboard = {
		inline_keyboard: [
			[
				{ text: '🚀 Основні', callback_data: 'help_main' },
				{ text: '💠 ШІ', callback_data: 'help_ai'}
			],
			[
				{ text: '📝 Завдання', callback_data: 'help_tasks' },
				{ text: '🎯 Цілі', callback_data: 'help_streaks' }
			],
			[
				{ text: '📊 Статистика', callback_data: 'help_stats' },
			]
		]
	};

	const reply = `✻ *Оберіть категорію команд:*`;

	const sentMessage = await sendMessage(TELEGRAM_API_URL, chatId, reply, {
		parse_mode: 'Markdown',
		reply_markup: JSON.stringify(keyboard)
	});

	await env.DB.prepare('INSERT OR REPLACE INTO bot_messages (chat_id, command, message_id) VALUES (?, ?, ?)')
		.bind(chatId, command, sentMessage.message_id)
		.run();

	if (message.message_id) {
		await deleteMessage(TELEGRAM_API_URL, chatId, message.message_id);
	}
}

// Функція створення цілі
export async function handleStreakCommand(db, TELEGRAM_API_URL, message) {
	const args = message.text.substring(8).trim().split(' ');
	if (args.length < 1) {
		const reply = 'Неправильний формат команди. Використовуйте /streak add <назва цілі>, /streak check або /streak delete <назва цілі>.';
		await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
		return;
	}
	const streakCommand = args[0];
	if (streakCommand === 'add') {
		const goalName = args.slice(1).join(' ');
		await handleAddStreak(db, TELEGRAM_API_URL, message.chat.id, goalName);
	} else if (streakCommand === 'check') {
		await handleCheckStreaks(db, TELEGRAM_API_URL, message.chat.id);
	} else if (streakCommand === 'delete') {
		const goalName = args.slice(1).join(' ');
		await handleDeleteStreak(db, TELEGRAM_API_URL, message.chat.id, goalName);
	} else {
		const reply = 'Невідома команда streak. Використовуйте /streak add <назва цілі>, /streak check або /streak delete <назва цілі>.';
		await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
	}
}

// Функція для перевірки статусу
export async function handleStatusCommand(env, TELEGRAM_API_URL, message) {
	const status = await checkServicesAvailability();
	const reply =
		`✻ *Статус доступності:*\n\n` +
		`Генерація тексту: ${status.textGeneration ? '💚' : '❤️'}\n` +
		`Генерація зображень: ${status.imageGeneration ? '💚' : '❤️'}\n` +
		`Розпізнавання зображень: ${status.imageRecognition ? '💚' : '❤️'}`;

	await sendMessage(TELEGRAM_API_URL, message.chat.id, reply, { parse_mode: 'Markdown' });
	await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
}

// Функція додавання важливої інформації
export async function handleSetDataCommand(db, TELEGRAM_API_URL, message) {
	const data = message.text.substring(8).trim();
	if (!data) {
		const reply = 'Будь ласка, надайте дані для запису.';
		await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
		return;
	}
	await saveUserData(db, message.from.id, data);
	const reply = `Дані успішно записані: ${data}`;
	await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
	await saveMessage(db, message.from.id, message.chat.id, 'bot', reply);
}

// Функція для отримання ID
export async function handleIdCommand(env, TELEGRAM_API_URL, message) {
	const reply = `Ваш Telegram ID: \`${message.from.id}\``;
	await sendMessage(TELEGRAM_API_URL, message.chat.id, reply, { parse_mode: 'Markdown' });
	await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
}
