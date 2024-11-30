const { Telegraf } = require('telegraf');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');


const bot = new Telegraf('7961011670:AAH8meaRqph9XYLKEvcj98J_etHSvMCL3xo'); // Replace with your bot token

// Temporary in-memory storage for user sessions
const userSessions = {};

// Start command
bot.start((ctx) => {
  ctx.reply(
    '🇺🇿Assalomu alaykum! Menga rasmlar yuboring va Men uni siz uchun PDF qilib beraman, /createpdf kommandasidan foydalanib PDF fayl yaratishingiz mumkin\n\n🇷🇺Привет! Присылайте мне фотографии, и я оформлю их в PDF-файл. Вы можете использовать команду /createpdf.'
  );
});

// Photo handling
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;

  // Initialize the session if it doesn't exist
  if (!userSessions[userId]) {
    userSessions[userId] = { photos: [], awaitingFileName: false, fileName: null };
  }

  // Get the highest quality photo file_id
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  try {
    // Get the file URL
    const fileUrl = await ctx.telegram.getFileLink(fileId);

    // Download the file as a buffer
    const response = await axios.get(fileUrl.href, { responseType: 'arraybuffer' });

    // Save the buffer in the session
    userSessions[userId].photos.push(response.data);

    ctx.reply(`🇺🇿Rasm qabul qilindi! Siz jo'natgan rasmlar soni: ${userSessions[userId].photos.length}\nAgar tayyor bo'lsangiz: /createpdf\n\n🇷🇺Изображение принято! Количество отправленных вами изображений: ${userSessions[userId].photos.length}\nКогда будете готовы: /createpdf`);
  } catch (error) {
    console.error('Error downloading photo:', error);
    ctx.reply('There was an error processing your photo. Please try again.');
  }
});
bot.command("help", async (ctx) => {
  ctx.reply("🇺🇿Botdan foydalanish qo'llanmasi 🔖\nSiz birinchi menga PDF qilmoqchi bo'lgan rasmlaringizni jo'nating. Uni hohlasangiz bitta bitta qilib jo'natishingiz mumkin yoki bir vaqtning o'zida hammasini yuborishingiz ham mumkin. Qachonki rasmlarni hammasini yuklab bo'lganizga ishonch komil qilgan bo'lsangiz, /createpdf kommandasidan foydalaning.\n\n🇷🇺Руководство пользователя бота 🔖\nСначала пришлите мне изображения, которые вы хотите сохранить в формате PDF. Вы можете отправлять их по одному, если хотите, или вы можете отправить их все сразу. Если вы уверены, что загрузили все изображения, используйте команду /createpdf.")
})
// PDF creation request
bot.command('createpdf', async (ctx) => {
  const userId = ctx.from.id;

  // Check if the user has sent any photos
  if (!userSessions[userId] || userSessions[userId].photos.length === 0) {
    return ctx.reply(`🇺🇿Siz hali menga rasmlar jo'natmadingiz, siz birinchi menga PDF qilmoqchi bo'lgan rasmlaringizni tashlang\n\n🇷🇺Вы еще не прислали мне ни одной фотографии, сначала пришлите мне фотографии, которые хотите сохранить в формате PDF🤕`);
  }

  // Prompt the user for a PDF name
  userSessions[userId].awaitingFileName = true;
  ctx.reply('🇺🇿PDF faylingizga qanday nom berishni xohlaysiz? (Iltimos, faqat ism bilan javob bering)✍🏻\n\n🇷🇺Как вы хотите назвать свой PDF-файл? (Пожалуйста, укажите только имя)✍🏻');
});
// Command to clear the session manually
bot.command('clear', (ctx) => {
  const userId = ctx.from.id;
  if (userSessions[userId]) {
    delete userSessions[userId];
    ctx.reply('🇺🇿Rasmlar tozalab yuborildi 🧹\n\n🇷🇺Изображения очищены и отправлены 🧹');
  } else {
    ctx.reply('🇺🇿Rasmlar mavjud emas tozalash uchun 🛑\n\n🇷🇺Фотографии недоступны для чистки 🛑');
  }
});
// Handle custom PDF file name input
bot.on('text', async (ctx, next) => {
  const userId = ctx.from.id;

  // Check if the bot is waiting for a file name
  if (userSessions[userId]?.awaitingFileName) {
    const fileName = ctx.message.text.trim();

    // Ensure the file name is valid
    if (!fileName || fileName.length > 50 || /[<>:"/\\|?*]/.test(fileName)) {
      return ctx.reply('🇺🇿Fayl nomi noto‘g‘ri. Maxsus belgilarsiz yaroqli nom tanlang ⚠️\n\n🇷🇺Имя файла неверно. Выберите допустимое имя без специальных символов ⚠️');
    }

    // Save the file name and generate the PDF
    userSessions[userId].fileName = fileName;
    userSessions[userId].awaitingFileName = false;

    try {
      // Send a placeholder message
      const statusMessage = await ctx.reply("⏳");

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();

      // Add each photo as a page
      for (const photoBuffer of userSessions[userId].photos) {
        const image = await pdfDoc.embedJpg(photoBuffer);
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      // Save the PDF to a buffer
      const pdfBytes = await pdfDoc.save();

      // Send the PDF to the user
      await ctx.replyWithDocument({
        source: Buffer.from(pdfBytes),
        filename: `${fileName}.pdf`,
      });

      // Delete the "⏳" message
      await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id);

      // Clear the user's session
      delete userSessions[userId];
    } catch (error) {
      console.error('Error creating PDF:', error);

      // Delete the "⏳" message even in case of an error
      await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id);

      ctx.reply('There was an error creating your PDF. Please try again.');
    }
  } else {
    ctx.reply("⚠️Nomalum buyruq\n\n⚠️Неизвестная команда");
    next();
  }
});



// Launch the bot
bot.launch();

console.log('Bot is running. Press Ctrl+C to stop.');
