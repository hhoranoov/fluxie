import { sendMessage } from './utils';

// Функція додавання цілі
export async function handleAddStreak(db, TELEGRAM_API_URL, chatId, goalName) {
	if (!goalName) {
		return sendMessage(TELEGRAM_API_URL, chatId, 'Неправильний формат команди. Використовуйте /streak add <назва цілі>');
	}

  let streaks = await getUserStreaks(db, chatId);

	if (streaks[goalName]) {
		return sendMessage(
			TELEGRAM_API_URL,
			chatId,
			`Ціль "${goalName}" вже існує. Ви можете перевірити її за допомогою команди /streak check.`
		);
	}

	streaks[goalName] = {
		startDate: new Date().toISOString(),
		lastChecked: new Date().toISOString(),
		streakCount: 1,
	};

	await saveUserStreaks(db, chatId, streaks);
	await sendMessage(TELEGRAM_API_URL, chatId, `Ціль "${goalName}" додана! 🎉`);
}

// Функція перевірки цілі
export async function handleCheckStreaks(db, TELEGRAM_API_URL, chatId) {
	let streaks = await getUserStreaks(db, chatId);

	if (Object.keys(streaks).length === 0) {
		return sendMessage(
			TELEGRAM_API_URL,
			chatId,
			'У вас немає активних streaks. Додайте ціль за допомогою команди /streak add <назва цілі>.'
		);
	}

	const now = new Date();
	let streakMessages = [];

	for (const goalName in streaks) {
		const streak = streaks[goalName];
		const lastCheckedDate = new Date(streak.lastChecked);
		const daysSinceLastCheck = Math.floor((now - lastCheckedDate) / (1000 * 60 * 60 * 24));

		if (daysSinceLastCheck > 1) {
			streak.streakCount = 1;
			streak.startDate = now.toISOString();
			streak.lastChecked = now.toISOString();
			await sendMessage(TELEGRAM_API_URL, chatId, `Ціль "${goalName}" зірвалася. Нова спроба почалася сьогодні.`);
		} else if (daysSinceLastCheck === 1) {
			streak.streakCount += 1;
			streak.lastChecked = now.toISOString();
		}

		const startDate = new Date(streak.startDate);
		const streakDuration = Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;

		streakMessages.push(
			`Ціль: *${goalName}*\nСтарт: *${startDate.toLocaleDateString()}*\nПоточний streak: *${
				streak.streakCount
			} днів* (${streakDuration} днів без перерви)`
		);
	}

	await saveUserStreaks(db, chatId, streaks);

	const messageText = streakMessages.join('\n\n');
	await sendMessage(TELEGRAM_API_URL, chatId, messageText, { parse_mode: 'Markdown' });
}

// Функція видалення цілі
export async function handleDeleteStreak(db, TELEGRAM_API_URL, chatId, goalName) {
	if (!goalName) {
		return sendMessage(TELEGRAM_API_URL, chatId, 'Неправильний формат команди. Використовуйте /streak delete <назва цілі>');
	}

	let streaks = await getUserStreaks(db, chatId);

	if (!streaks[goalName]) {
		return sendMessage(TELEGRAM_API_URL, chatId, `Ціль "${goalName}" не знайдена.`);
	}

	delete streaks[goalName];
	await saveUserStreaks(db, chatId, streaks);
	await sendMessage(TELEGRAM_API_URL, chatId, `Ціль "${goalName}" видалена.`);
}

// Функція отримання цілей DB
export async function getUserStreaks(db, chatId) {
	const result = await db.prepare('SELECT streaks FROM user_streaks WHERE chat_id = ?').bind(chatId).first();
	return result?.streaks ? JSON.parse(result.streaks) : {};
}

// Функція зберігання цілей DB
export async function saveUserStreaks(db, chatId, streaks) {
	await db.prepare('INSERT OR REPLACE INTO user_streaks (chat_id, streaks) VALUES (?, ?)').bind(chatId, JSON.stringify(streaks)).run();
}
