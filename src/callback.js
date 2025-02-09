import { sendMessage } from './utils.js';

export async function handleCallbackQuery(db, TELEGRAM_API_URL, callbackQuery) {
	const chatId = callbackQuery.message.chat.id;
	await sendMessage(TELEGRAM_API_URL, chatId, '⚠️ Callback-запити ще не реалізовано.');
}
