import { sendMessage, editTelegramMessage, deleteMessage } from './utils.js';
import { handleHelpCommand } from './handlers.js';

export async function handleCallbackQuery(env, TELEGRAM_API_URL, callbackQuery) {
	const chatId = callbackQuery.message.chat.id;
	const messageId = callbackQuery.message.message_id;
	const data = callbackQuery.data;

	const helpTexts = {
		help_tasks: {
			text: `📝 *Команди для завдань:*\n
- /add <день> <час> <завдання> - додати нове завдання
- /today - переглянути завдання на сьогодні
- /tasks <день> - переглянути завдання на конкретний день
**Функціонал в розробці**`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},

		help_ai: {
			text: `💠 *Команди ШІ:*
- /status - перевірити статус ШІ сервісів
- /image <промпт> - згенерити зображення
- /remember <дані> - додати в пам'ять ШІ`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},

		help_main: {
			text: `🚀 *Основні команди:*\n
- /start - почати роботу з ботом
- /help - отримати допомогу
- /id - отримати ID користувача`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},

		help_stats: {
			text: `📊 *Статистика:*\n
- /stats week - статистика за тиждень
- /stats month - статистика за місяць`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},

		help_streaks: {
			text: `🎯 *Цілі (Streaks):*\n
- /streak add <назва> - додати нову ціль
- /streak check - перевірити streaks
- /streak delete <назва> - видалити ціль`,
			keyboard: [[{ text: '⬅️ Назад', callback_data: 'help' }]],
		},
	};

	if (helpTexts[data]) {
		await editTelegramMessage(TELEGRAM_API_URL, chatId, messageId, helpTexts[data].text, {
			parse_mode: 'Markdown',
			reply_markup: JSON.stringify({ inline_keyboard: helpTexts[data].keyboard }),
		});
		// Обробник help
	} else if (data === 'help') {
		await handleHelpCommand(env, TELEGRAM_API_URL, callbackQuery.message, false);
	}

	// Callback запит оброблено
	await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ callback_query_id: callbackQuery.id }),
	});
}
