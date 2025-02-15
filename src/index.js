import {
	handleStreakCommand,
	handleIdCommand,
	handleStartCommand,
	handleStatusCommand,
	handleHelpCommand,
	handleSetDataCommand,
	handleAddCommand,
	handleTodayCommand,
	handleTasksCommand,
	handleStatsCommand,
	handleBroadcastCommand,
} from './handlers';
import { handleDefaultText, handleImageCommand, handlePhotoCommand, handleClearCommand, saveUserData } from './assistant';
import { sendMessage, saveMessage, checkGroupAdmins } from './utils';
import { handleCallbackQuery } from './callback';

export default {
	async fetch(request, env) {
		const TELEGRAM_API_URL = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;
		const update = await request.json();

		if (update.callback_query) {
			await handleCallbackQuery(env, TELEGRAM_API_URL, update.callback_query);
		} else if (update.message) {
			await processMessage(env, TELEGRAM_API_URL, update.message);
		}
		return new Response('OK');
	},
};

async function processMessage(env, TELEGRAM_API_URL, message) {
	const userID = message?.from?.id;
	const userName = message?.from?.first_name || message?.from?.username || 'Не визначено';
	const chatID = message.chat.id;
	const allowedUsers = JSON.parse(env.USERS || '[]');
	const admins = Array.isArray(env.ADMIN) ? env.ADMIN : JSON.parse(env.ADMIN || '[]');
	const triggerWords = ['флюксі', 'fluxie', 'флюкс', 'флю', 'ксі'];

	if (chatID > 0 && !allowedUsers.includes(userID)) {
		await sendMessage(
			TELEGRAM_API_URL,
			chatID,
			'⛔ *Доступ обмежений!*\n\n' +
				'Цей бот знаходиться в розробці, і його використання доступне лише для вибраних користувачів.' +
				'Доступ буде обмежений завжди.\n\n' +
				'Якщо ви вважаєте, що вам потрібен доступ, зверніться в [підтримку](t.me/horanov).',
			{
				parse_mode: 'Markdown',
			}
		);
		return;
	}

	if (chatID < 0) {
		const isGroupAllowed = await checkGroupAdmins(TELEGRAM_API_URL, chatID, allowedUsers);
		if (!isGroupAllowed) {
			await sendMessage(
				TELEGRAM_API_URL,
				chatID,
				'⛔ *Доступ обмежений!*\n\nУ цій групі немає адміністратора зі списку дозволених користувачів.',
				{ parse_mode: 'Markdown' }
			);
			return;
		}

		if (message?.text) {
			const textLower = message.text.toLowerCase();
			const containsTrigger = triggerWords.some((word) => textLower.includes(word));

			if (!containsTrigger) {
				return;
			}
		} else {
			return;
		}
	}

	// Збереження даних користувача
	if (message?.from?.first_name) {
		await saveUserData(env.DB, message.from.id, { first_name: message.from.first_name });
	}

	// Збереження повідомлень
	if (message?.text) {
		await saveMessage(env.DB, message.from.id, userName, message.chat.id, 'user', message.text);
		// Обробка команд
		if (message.text.startsWith('/start')) {
			await handleStartCommand(env, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/help')) {
			await handleHelpCommand(env, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/id')) {
			await handleIdCommand(env, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/status')) {
			await handleStatusCommand(env, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/image')) {
			await handleImageCommand(env, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/remember ')) {
			await handleSetDataCommand(env.DB, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/clear')) {
			await handleClearCommand(env.DB, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/streak ')) {
			await handleStreakCommand(env.DB, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/add ')) {
			await handleAddCommand(env.DB, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/today')) {
			await handleTodayCommand(env.DB, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/tasks ')) {
			await handleTasksCommand(env.DB, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/stats ')) {
			await handleStatsCommand(env.DB, TELEGRAM_API_URL, message);
		} else if (message.text.startsWith('/broadcast ')) {
			await handleBroadcastCommand(env, TELEGRAM_API_URL, message, admins);
		} else if (message.text.startsWith('/settings')) {
			const reply = 'В розробці!';
			await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
		} else {
			await handleDefaultText(env.DB, TELEGRAM_API_URL, message);
		}
	} else if (message?.photo) {
		await handlePhotoCommand(env, TELEGRAM_API_URL, message);
	}
}
