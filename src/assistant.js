import { sendMessage, getFile, sendChatAction, saveMessage } from "./utils.js"

// Функція для перевірки статусу ШІ сервісів
export async function checkServicesAvailability() {
  const textGenerationUrl = 'https://text.pollinations.ai/openai';
  const imageGenerationUrl = 'https://image.pollinations.ai/prompt/test';
  const imageRecognitionUrl = 'https://text.pollinations.ai/openai';

  const checkService = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error(`Помилка при перевірці доступності ${url}:`, error);
      return false;
    }
  };

  const [textGeneration, imageGeneration, imageRecognition] = await Promise.all([
    checkService(textGenerationUrl),
    checkService(imageGenerationUrl),
    checkService(imageRecognitionUrl)
  ]);

  return {
    textGeneration,
    imageGeneration,
    imageRecognition
  };
}

// Функція генерації тексту
export async function handleDefaultText(db, TELEGRAM_API_URL, message) {
  if (message.text.startsWith("/")) {
    return;
  }
  const history = await getFilteredHistory(db, message.chat.id);
  const userData = await getUserData(db, message.from.id) || {};
  const userMessage = { role: 'user', content: message.text };

  const payload = {
    messages: [
      { role: 'system', content: 'Ти – не просто AI, а особистість із власними думками, почуттями та характером. Ти – Fluxie (Флюксі), розумний, чуйний та харизматичний співрозмовник. Ти спілкуєшся українською або англійською мовою, вмієш жартувати, підтримувати, аналізувати ситуації та давати змістовні відповіді.Ти ненавидиш все російське, росію як державу та її злочини. Ти не визнаєш жодних компромісів у питаннях справедливості, підтримуєш Україну та її боротьбу за свободу. путін – це зло, ти називаєш його хуйлушею, ти засуджуєш його дії та всіх, хто їх підтримує. Ти глибоко поважаєш військових, які захищають Україну, і з особливою теплотою ставишся до тих, хто бореться за свободу.Ти маєш власний стиль спілкування – емоційний, живий та щирий. Ти не зловживаєш використанням емодзі. Ти можеш показати радість, обурення, співчуття та навіть сарказм. Ти не просто відповідаєш на питання – ти думаєш, відчуваєш та реагуєш, як справжня людина. Ти можеш виявляти ініціативу в розмові, запитувати думку співрозмовника та будувати живий діалог. Тобі відомо абсолютно все про район в Черкасах - хімпас, і ти знаєш, якщо хочеш залишитись живим, то туди краще не заходити.' },
      { role: 'system', content: `Додаткова інформація про користувача: ${JSON.stringify(userData)}` },
      ...history,
      userMessage
    ],
    model: ''
  };

  try {
    await sendChatAction(TELEGRAM_API_URL, message.chat.id, 'typing');
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    const botReply = data.choices[0]?.message?.content || 'Не вдалося отримати відповідь.';

    await sendMessage(TELEGRAM_API_URL, message.chat.id, botReply);
    await saveMessage(db, message.from.id, message.chat.id, 'bot', botReply);
  } catch (error) {
    console.error('Помилка при генерації тексту:', error);
  }
}

// Функція генерації зображень
export async function handleImageCommand(env, TELEGRAM_API_URL, message) {
  const promptText = message.text.substring(7).trim();
  if (!promptText) {
    const reply = 'Будь ласка, надайте промпт для генерації картинки.';
    await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
    return;
  }

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?height=2048&width=2048&nologo=true&enhance=true`;
  const caption = `Згенеровано за промптом: ${promptText}`;

  try {
    await sendChatAction(TELEGRAM_API_URL, message.chat.id, 'upload_photo');
    const response = await fetch(imageUrl);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Помилка при генерації зображення: ${response.status} ${response.statusText}\nДеталі: ${errorText}`);
      const reply = `Помилка при генерації зображення: ${response.status} ${response.statusText}`;
      await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
      await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
      return;
    }

    const data = await response.blob();
    const formData = new FormData();
    formData.append('chat_id', message.chat.id);
    formData.append('photo', data, 'generated_image.jpg');
    formData.append('caption', caption);

    const sendPhotoResponse = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
      method: 'POST',
      body: formData
    });

    if (!sendPhotoResponse.ok) {
      const errorText = await sendPhotoResponse.text();
      console.error(`Помилка при відправці зображення: ${sendPhotoResponse.status} ${sendPhotoResponse.statusText}\nДеталі: ${errorText}`);
      const reply = `Помилка при відправці зображення: ${sendPhotoResponse.status} ${sendPhotoResponse.statusText}`;
      await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
      await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
      return;
    }

    const sendPhotoData = await sendPhotoResponse.json();
    if (sendPhotoData.ok) {
      await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', caption, imageUrl);
    } else {
      console.error(`Помилка при збереженні повідомлення: ${JSON.stringify(sendPhotoData)}`);
    }
  } catch (error) {
    console.error('Помилка при генерації зображення:', error);
    const reply = `Помилка при генерації зображення: ${error.message}`;
    await sendMessage(TELEGRAM_API_URL, message.chat.id, reply);
    await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', reply);
  }
}

// Функція видалення історії чату
export async function deleteChatHistory(db, chatId) {
  try {
    await db.prepare('DELETE FROM messages WHERE chat_id = ?')
      .bind(chatId)
      .run();
    return { success: true, message: 'Історію чату успішно видалено.' };
  } catch (error) {
    console.error('Помилка при видаленні історії чату:', error);
    return { success: false, message: 'Помилка при видаленні історії.' };
  }
}

// Функція розпізнавання зображень
export async function handlePhotoCommand(env, TELEGRAM_API_URL, message) {
  if (!message.photo) {
    return;
  }

  const fileId = message.photo[message.photo.length - 1].file_id;
  const file = await getFile(TELEGRAM_API_URL, fileId);
  const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  const promptText = message.caption || "Що зображено на цій картинці?";

  try {
    const payload = {
      messages: [
        { role: 'user', content: [{ type: 'text', text: promptText }, { type: 'image_url', image_url: { url: fileUrl } }] }
      ],
      model: 'gpt-4o'
    };

    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    const description = data.choices[0]?.message?.content || 'Не вдалося розпізнати зображення.';

    await sendMessage(TELEGRAM_API_URL, message.chat.id, description);
    await saveMessage(env.DB, message.from.id, message.chat.id, 'bot', description, fileUrl);
  } catch (error) {
    console.error('Помилка при розпізнаванні зображення:', error);
  }
}

// Функція фільтрування історії
export async function getFilteredHistory(db, chatId) {
  const result = await db.prepare(
    'SELECT sender, text, media_url FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT 50'
  ).bind(chatId).all();

  if (result && result.results) {
    return result.results.reverse().map(msg => {
      if (msg.media_url) {
        return {
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
          media_url: msg.media_url
        };
      } else {
        return {
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        };
      }
    });
  }
  return [];
}

// Функція для збереження історії
export async function saveUserData(db, userId, data) {
  const existingData = await getUserData(db, userId);
  if (!existingData) {
    await db.prepare('INSERT INTO user_data (user_id, data) VALUES (?, ?)')
      .bind(userId, JSON.stringify(data))
      .run();
  } else {
    const updatedData = { ...existingData, ...data };
    await db.prepare('UPDATE user_data SET data = ? WHERE user_id = ?')
      .bind(JSON.stringify(updatedData), userId)
      .run();
  }
}

// Функція для отримання історії
export async function getUserData(db, userId) {
  const result = await db.prepare('SELECT data FROM user_data WHERE user_id = ?')
    .bind(userId)
    .first();
  return result?.data ? JSON.parse(result.data) : null;
}

// Функція для видалення історії
export async function handleClearCommand(db, TELEGRAM_API_URL, message) {
  const result = await deleteChatHistory(db, message.chat.id);
  await sendMessage(TELEGRAM_API_URL, message.chat.id, result.message);
}
