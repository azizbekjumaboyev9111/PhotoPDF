const { Telegraf, session, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const axios = require("axios")
const bot = new Telegraf(process.env.BOT_TOKEN);
const usersFilePath = path.join(__dirname, 'users.json');
const ownerId = parseInt(process.env.OWNER_ID, 10);
const ownerID = process.env.OWNER_ID;
const admins = loadData('admins.json') || [];
const { PDFDocument } = require('pdf-lib');
// Data storage
const userIDs = loadData('users.json') || [];
const requiredChannels = loadData('required_channels.json') || [];
const requiredGroups = loadData('required_groups.json') || [];
const messageStats = loadData('message_stats.json') || {};
const requiredprivategroupsandchannels = loadData("required_private.json") || [];
// Temporary in-memory storage for user sessions
const userSessions = {};
// Function to handle viewing channels
async function handleViewChannels(ctx) {
  const channelList = requiredChannels.length ? requiredChannels.join('\n') : 'No channels required';
  await ctx.answerCbQuery(); // Answer the callback query to acknowledge the action
  await ctx.reply(`Current Channels:\n${channelList}`);
}
// modules
let watch = 0;

bot.use(session());

// Function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to create a progress bar animation
async function sendProgressBar(ctx, messageId) {
  const steps = 100; // More steps for smoother animation
  const barLength = 20; // Length of the progress bar
  for (let i = 1; i <= steps; i++) {
    const progress = Math.round((i / steps) * 100);
    const filledBar = '█'.repeat(Math.round((i / steps) * barLength));
    const emptyBar = '░'.repeat(barLength - filledBar.length);
    const progressBar = `Progress: [${filledBar}${emptyBar}] ${progress}%`;

    if (i % 5 === 0 || i === steps) { // Update every 5% for smoother effect
      await bot.telegram.editMessageText(ctx.chat.id, messageId, null, progressBar);
    }

    await sleep(50); // Adjust the speed of the animation here
  }
}

// Generalized function to handle progress bar for both replacing and sending files
async function handleProgressBar(ctx, operationType) {
  const initialMessage = await ctx.reply(`${operationType} file: [░░░░░░░░░░░░░░░░░░] 0%`);
  await sendProgressBar(ctx, initialMessage.message_id);
  await bot.telegram.deleteMessage(ctx.chat.id, initialMessage.message_id);
}


// Function to create a progress bar animation
async function sendProgressBar(ctx, messageId) {
  const steps = 100; // More steps for smoother animation
  const barLength = 20; // Length of the progress bar
  for (let i = 1; i <= steps; i++) {
    const progress = Math.round((i / steps) * 100);
    const filledBar = '█'.repeat(Math.round((i / steps) * barLength));
    const emptyBar = '░'.repeat(barLength - filledBar.length);
    const progressBar = `Progress: [${filledBar}${emptyBar}] ${progress}%`;

    if (i % 5 === 0 || i === steps) { // Update every 5% for smoother effect
      await bot.telegram.editMessageText(ctx.chat.id, messageId, null, progressBar);
    }

    await sleep(50); // Adjust the speed of the animation here
  }
}

// Generalized function to handle progress bar for both replacing and sending files
async function handleProgressBar(ctx, operationType) {
  const initialMessage = await ctx.reply(`${operationType} file: [░░░░░░░░░░░░░░░░░░] 0%`);
  await sendProgressBar(ctx, initialMessage.message_id);
  await bot.telegram.deleteMessage(ctx.chat.id, initialMessage.message_id);
}



// Function to handle viewing groups
async function handleViewGroups(ctx) {
  const groupList = requiredGroups.length ? requiredGroups.join('\n') : 'No groups required';
  await ctx.answerCbQuery(); // Answer the callback query to acknowledge the action
  await ctx.reply(`Current Groups:\n${groupList}`);
}


async function checkBotAdmin(ctx, link) {
  try {
    const cleanUsername = link.replace('@', '');
    link = `https://t.me/${cleanUsername}`
    // Extract username from the link
    const username = link.split('/').pop();

    // Get chat information
    const chat = await ctx.telegram.getChat('@' + username);

    // Check if the bot is admin in the chat
    const botInfo = await ctx.telegram.getChatMember(chat.id, ctx.botInfo.id);
    return botInfo.status === 'administrator' || botInfo.status === 'creator';
  } catch (error) {
    console.error('Error checking bot admin:', error);
    return false;
  }
}

async function you_need_to_join(ctx) {
  const channelLinks = requiredChannels.map(formatLink);
  const groupLinks = requiredGroups.map(formatLink);

  const channelButtons = channelLinks.map(link => ({
    text: 'Kanal',
    url: link
  }));

  const groupButtons = groupLinks.map(link => ({
    text: 'Guruh',
    url: link
  }));

  const privatelinks = requiredprivategroupsandchannels
    .map(link => ({
      text: "Kanal",
      url: link
    }))

  const checkButton = {
    text: 'Tekshirish ✅',
    callback_data: 'check_membership'
  };

  const inlineKeyboard = [
    ...privatelinks.map(button => [button]),
    ...channelButtons.map(button => [button]),
    ...groupButtons.map(button => [button]),
    [checkButton]
  ];

  const message = await ctx.reply(
    "❌ Kechirasiz, botimizdan foydalanishdan oldin ushbu kanallarga a'zo bo'lishingiz kerak:",
    {
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    }
  );
}






// Function to check if a user is a member of required channels and groups
const checkMembership = async (ctx) => {
  for (const channel of requiredChannels) {
    try {
      const member = await bot.telegram.getChatMember(channel, ctx.from.id);
      if (member.status !== 'member' && member.status !== 'administrator' && member.status !== 'creator') {
        return false;
      }
    } catch (error) {
      console.error('Error checking channel membership:', error);
      return false;
    }
  }
  for (const group of requiredGroups) {
    try {
      const member = await bot.telegram.getChatMember(group, ctx.from.id);
      if (member.status !== 'member' && member.status !== 'administrator' && member.status !== 'creator') {
        return false;
      }
    } catch (error) {
      console.error('Error checking group membership:', error);
      return false;
    }
  }
  return true;
};



// Initialize currentOperation
const currentOperation = {};

// Load data from JSON file
function loadData(filename) {
  const filepath = path.join(__dirname, filename);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }
  return [];
}

// Save data to JSON file
function saveData(filename, data) {
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2));
}

// Helper function to check if user is an admin or owner
const isAdminOrOwner = (userID) => {
  console.log('Checking if user is admin or owner...');
  console.log('User ID:', userID);
  console.log('Admins:', admins);
  console.log('Owner ID:', ownerId);

  // Convert userID to string for comparison
  const stringUserID = String(userID);

  return admins.includes(stringUserID) || stringUserID === String(ownerId);
};

// Function to format URLs for channels and groups
const formatLink = (username) => `https://t.me/${username.replace('@', '')}`;

// Function to format timestamp for readability
const formatDate = (date) => new Date(date).toLocaleString();

// Function to format URLs correctly
const formatLinkv2 = (link) => {
  if (link.startsWith('@')) {
    return `https://t.me/${link.slice(1)}`;
  }
  return link;
};




// Start command
bot.start(async (ctx) => {
  const userID = ctx.from.id;
  const userId = ctx.message.from.id;
  if (!userIDs.includes(userID)) {
    userIDs.push(userID);
    saveData('users.json', userIDs);
  }


  if (await checkMembership(ctx)) {
    // shu yerga start uchun xabar kiritiladi
    ctx.reply(
      '🇺🇿Assalomu alaykum! Menga rasmlar yuboring va Men uni siz uchun PDF qilib beraman, /createpdf kommandasidan foydalanib PDF fayl yaratishingiz mumkin\n\n🇷🇺Привет! Присылайте мне фотографии, и я оформлю их в PDF-файл. Вы можете использовать команду /createpdf.'
    );
  } else {
    you_need_to_join(ctx)
  }
});
// Photo handling
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  if (!userIDs.includes(userId)) {
    userIDs.push(userId);
    saveData('users.json', userIDs);
  }
  if (await checkMembership(ctx)) {
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
  } else {
    you_need_to_join(ctx);
  }
});
bot.command("help", async (ctx) => {
  const userId = ctx.from.id;
  if (!userIDs.includes(userId)) {
    userIDs.push(userId);
    saveData('users.json', userIDs);
  }
  if (await checkMembership(ctx)) {
    ctx.reply("🇺🇿Botdan foydalanish qo'llanmasi 🔖\nSiz birinchi menga PDF qilmoqchi bo'lgan rasmlaringizni jo'nating. Uni hohlasangiz bitta bitta qilib jo'natishingiz mumkin yoki bir vaqtning o'zida hammasini yuborishingiz ham mumkin. Qachonki rasmlarni hammasini yuklab bo'lganizga ishonch komil qilgan bo'lsangiz, /createpdf kommandasidan foydalaning.\n\n🇷🇺Руководство пользователя бота 🔖\nСначала пришлите мне изображения, которые вы хотите сохранить в формате PDF. Вы можете отправлять их по одному, если хотите, или вы можете отправить их все сразу. Если вы уверены, что загрузили все изображения, используйте команду /createpdf.")
  } else {
    you_need_to_join(ctx);
  }
})
// PDF creation request
bot.command('createpdf', async (ctx) => {
  const userId = ctx.from.id;
  if (!userIDs.includes(userId)) {
    userIDs.push(userId);
    saveData('users.json', userIDs);
  }

  if (await checkMembership(ctx)) {
    // Check if the user has sent any photos
    if (!userSessions[userId] || userSessions[userId].photos.length === 0) {
      return ctx.reply(`🇺🇿Siz hali menga rasmlar jo'natmadingiz, siz birinchi menga PDF qilmoqchi bo'lgan rasmlaringizni tashlang\n\n🇷🇺Вы еще не прислали мне ни одной фотографии, сначала пришлите мне фотографии, которые хотите сохранить в формате PDF🤕`);
    }

    // Prompt the user for a PDF name
    userSessions[userId].awaitingFileName = true;
    ctx.reply('🇺🇿PDF faylingizga qanday nom berishni xohlaysiz? (Iltimos, faqat ism bilan javob bering)✍🏻\n\n🇷🇺Как вы хотите назвать свой PDF-файл? (Пожалуйста, укажите только имя)✍🏻');
  } else {
    you_need_to_join(ctx);
  }
});
// Command to clear the session manually
bot.command('clear', async (ctx) => {
  const userId = ctx.from.id;
  if (await checkMembership(ctx)) {
    if (userSessions[userId]) {
      delete userSessions[userId];
      ctx.reply('🇺🇿Rasmlar tozalab yuborildi 🧹\n\n🇷🇺Изображения очищены и отправлены 🧹');
    } else {
      ctx.reply('🇺🇿Rasmlar mavjud emas tozalash uchun 🛑\n\n🇷🇺Фотографии недоступны для чистки 🛑');
    }
  } else {
    you_need_to_join(ctx);
  }
});
// Command to send files to the bot owner
bot.command('sendfiles', async (ctx) => {
  if (ctx.from.id.toString() === ownerID) {
    try {
      // Send users.json
      if (fs.existsSync(usersFilePath)) {
        await ctx.telegram.sendDocument(ownerId, {
          source: usersFilePath,
          filename: 'users.json'
        });
      } else {
        await ctx.reply("The file `users.json` doesn't exist.");
      }

      // Send final success message
      await ctx.reply('Files sent successfully!');
    } catch (error) {
      console.error('Error sending files:', error);
      ctx.reply('An error occurred while sending the files.');
    }
  } else {
    ctx.reply('You are not authorized to use this command.');
  }
});
// Admin panel command
bot.command('adminpanel', async (ctx) => {
  const userID = ctx.from.id;
  if (isAdminOrOwner(userID)) {
    const adminPanelButtons = [
      [{ text: "📊 Statistika", callback_data: 'view_total_users' }, { text: "👀 Adminlarni ko'rish", callback_data: 'view_admins' }],
      [{ text: "➕ Kanal qo'shish", callback_data: 'add_channel' }, { text: "➖ Kanalni o'chirish", callback_data: 'remove_channel' }],
      [{ text: "➕ Guruh qo'shish", callback_data: 'add_group' }, { text: "➖ Guruhni o'chirish", callback_data: 'remove_group' }],
      [{ text: "✈️ Xabar jo'natish", callback_data: 'send_message' }], [{ text: "👀 Kanallarni ko'rish", callback_data: 'view_channels' }, { text: "👀 Guruhlarni ko'rish", callback_data: 'view_groups' }],
      [{ text: "Foydalanuvchilarni kuzatish 👀", callback_data: "watch" }],
      [{ text: "➕ Zayafka qo'shish", callback_data: "add_zayafka" }, { text: "➖ Zayafkani o'chirish", callback_data: "remove_zayafka" }],
      [{ text: "👀 Private Links", callback_data: "private_links" }]
    ];

    if (userID === ownerId) {
      adminPanelButtons.unshift(
        [{ text: "➕ Admin qo'shish", callback_data: 'add_admin' }, { text: "➖ Admin o'chirish", callback_data: 'remove_admin' }]
      );
    }

    await ctx.reply('Admin Panel:', {
      reply_markup: {
        inline_keyboard: adminPanelButtons
      }
    });
  } else {
    await ctx.reply("Sizda ruxsat mavjud emas, bu yerga kirish uchun 🚫");
  }
});



bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userID = ctx.from.id;

  try {
    // Split data for actions related to movies
    const [action, movieIdStr] = data.split('_');
    const movieId = parseInt(movieIdStr, 10);
    if (data === 'view_total_users') {
      const totalUsers = userIDs.length;
      const activeUsers = messageStats.successfulDeliveries || 0;
      const inactiveUsers = messageStats.failedDeliveries || 0;
      const lastUpdated = formatDate(messageStats.lastUpdated || new Date());

      await ctx.reply(`Total Users: ${totalUsers}\nActive Users: ${activeUsers}\nInactive Users: ${inactiveUsers}\nLast Updated: ${lastUpdated}`);

    } else if (data === 'view_admins') {
      const adminList = admins.length ? admins.join('\n') : 'Adminlar mavjud emas !';
      await ctx.reply(`Admin IDs:\n${adminList}`);

    } else if (data === "private_links") {
      const privatelinksList = requiredprivategroupsandchannels.length ? requiredprivategroupsandchannels.join("\n") : "No Private Links available."
      await ctx.reply(`Private links:\n${privatelinksList}`)
    } else if (data === 'add_admin' && userID === ownerId) {
      currentOperation[userID] = { type: 'add_admin', messageId: null };
      const sentMessage = await ctx.reply("Iltimos, administrator sifatida qo'shish uchun foydalanuvchi IDisini yuboring:", {
        reply_markup: {
          inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel' }]]
        }
      });
      currentOperation[userID].messageId = sentMessage.message_id;

    } else if (data === 'remove_admin' && userID === ownerId) {
      currentOperation[userID] = { type: 'remove_admin', messageId: null };
      const sentMessage = await ctx.reply('Administratordan olib tashlash uchun foydalanuvchi IDisini yuboring:', {
        reply_markup: {
          inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel' }]]
        }
      });
      currentOperation[userID].messageId = sentMessage.message_id;

    } else if (['add_channel', 'remove_channel', 'add_group', 'remove_group'].includes(data)) {
      if (isAdminOrOwner(userID)) {
        currentOperation[userID] = { type: data, messageId: null };
        let prompt = '';

        if (data === 'add_channel') {
          prompt = "Iltimos, qo'shish uchun kanal foydalanuvchi nomini (masalan, @channelusername) yuboring:";
        } else if (data === 'remove_channel') {
          prompt = "Oʻchirish uchun kanal foydalanuvchi nomini (masalan, @channelusername) yuboring:";
        } else if (data === 'add_group') {
          prompt = "Quyidagilarni qoʻshish uchun guruh foydalanuvchi nomini (masalan, @groupusername) yuboring:";
        } else if (data === 'remove_group') {
          prompt = "Oʻchirish uchun guruh foydalanuvchi nomini (masalan, @groupusername) yuboring:";
        }

        const sentMessage = await ctx.reply(prompt, {
          reply_markup: {
            inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel' }]]
          }
        });
        currentOperation[userID].messageId = sentMessage.message_id;
      }

    } else if (data === 'send_message' && isAdminOrOwner(userID)) {
      currentOperation[userID] = { type: 'send_message', messageId: null };
      const sentMessage = await ctx.reply('Iltimos, barcha foydalanuvchilarga yuborish uchun xabarni yuboring:', {
        reply_markup: {
          inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel' }]]
        }
      });
      currentOperation[userID].messageId = sentMessage.message_id;

    } else if (data === "add_zayafka") {
      currentOperation[userID] = { type: 'add_zayafka', messageId: null };
      const sentMessage = await ctx.reply('Please send the Private link to remove from Private links:', {
        reply_markup: {
          inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel' }]]
        }
      });
      currentOperation[userID].messageId = sentMessage.message_id;
    } else if (data === "remove_zayafka") {
      currentOperation[userID] = { type: 'remove_zayafka', messageId: null };
      const sentMessage = await ctx.reply('Please send the Private link to remove from Private links:', {
        reply_markup: {
          inline_keyboard: [[{ text: 'Cancel', callback_data: 'cancel' }]]
        }
      });
      currentOperation[userID].messageId = sentMessage.message_id;
    } else if (data === 'cancel') {
      if (currentOperation[userID] && currentOperation[userID].messageId) {
        try {
          await ctx.deleteMessage(currentOperation[userID].messageId);
        } catch (err) {
          console.error('Failed to delete message:', err);
        }
        delete currentOperation[userID];
        await ctx.reply('Amalyot bekor qilindi');
      }

    } else if (data === 'view_channels') {
      await handleViewChannels(ctx);

    } else if (data === 'view_groups') {
      await handleViewGroups(ctx);

    } else if (data === 'cancel_operation') {
      if (currentOperation[userID]) {
        const lastMessageId = currentOperation[userID].lastMessageId;
        await ctx.deleteMessage(lastMessageId); // Delete the last message
        delete currentOperation[userID];
        await ctx.reply('Amalyot bekor qilindi !');
      }
    } else if (data === 'check_membership') {
      const userID = ctx.from.id;


      if (await checkMembership(ctx)) {
        await ctx.editMessageText("Tabreklaymiz siz kannalar va guruhlarga azo bo'ldingiz 🎉\n\nBotdan foydalanishingiz mumkin✅");
        await ctx.answerCbQuery('✅ Siz barcha kerakli kanallarga a\'zo bo\'lgansiz!');
      } else {
        await ctx.answerCbQuery('❌ Hali ham barcha kerakli kanallarga a\'zo emassiz.');
      }
    } else if (data === "watch") {
      if (watch === 0) {
        watch = 1
        ctx.answerCbQuery("Foydalanauvchini kuzatish akitvlashtirildi ✅")
      } else if (watch === 1) {
        watch = 0
        ctx.answerCbQuery("Foydalanuvchini kuzatish aktivsizlashtirildi ❌")
      }
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCbQuery('Something went wrong, please try again.');
  }
});
// Handle custom PDF file name input
bot.on('text', async (ctx, next) => {
  const userId = ctx.from.id;

  if (await checkMembership(ctx)) {
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
    } else if (isAdminOrOwner(userId)) {
      next();
    } else {
      ctx.reply("⚠️Nomalum buyruq\n/start\n\n⚠️Неизвестная команда\n/start");
      next();
    }
  } else if (isAdminOrOwner(userId)) {
    next();
  } else {
    you_need_to_join(ctx);
  }
});


// Handle incoming messages
bot.on('message', async (ctx) => {
  const userID = ctx.from.id;
  // if (!isAdminOrOwner(userID)) {
  //     let userid = ctx.from.username || ctx.from.first_name
  //     await ctx.reply("Bu buyruq mavjud emas, yoki bot yangilangan /start tugmasini bosib qo'ying");
  //     if (watch === 1) {
  //         await ctx.telegram.sendMessage(ownerId, `Bu foydalanuvchi botni buzmoqchi bo'ldi yoki adashdi @${userid}`);
  //         await bot.telegram.forwardMessage(ownerId, ctx.message.chat.id, ctx.message.message_id)
  //     }
  // }
  if (currentOperation[userID]) {
    const operation = currentOperation[userID];

    try {
      if (operation.type === 'add_admin') {
        if (!admins.includes(ctx.message.text)) {
          admins.push(ctx.message.text);
          saveData('admins.json', admins);
          await ctx.reply("Admin muvaffaqiyatli qo'shildi.");
        } else {
          await ctx.reply('Foydalanuvchi allaqachon administrator.');
        }
      } else if (operation.type === 'remove_admin') {
        const index = admins.indexOf(ctx.message.text);
        if (index > -1) {
          admins.splice(index, 1);
          saveData('admins.json', admins);
          await ctx.reply('Administrator muvaffaqiyatli olib tashlandi.');
        } else {
          await ctx.reply('Foydalanuvchi administrator emas.');
        }
      } else if (operation.type === 'add_channel') {
        if (!requiredChannels.includes(ctx.message.text)) {
          let link = ctx.message.text;
          const isAdmin = await checkBotAdmin(ctx, link);
          if (!isAdmin) {
            return ctx.reply('Bot is not admin in the provided group or channel ⚠️');
          }
          requiredChannels.push(ctx.message.text);
          saveData('required_channels.json', requiredChannels);
          await ctx.reply("Kanal muvaffaqiyatli qo'shildi.");
        } else {
          await ctx.reply("Kanal allaqachon ro'yxatda.");
        }
      } else if (operation.type === 'remove_channel') {
        const index = requiredChannels.indexOf(ctx.message.text);
        if (index > -1) {
          requiredChannels.splice(index, 1);
          saveData('required_channels.json', requiredChannels);
          await ctx.reply('Kanal muvaffaqiyatli olib tashlandi.');
        } else {
          await ctx.reply("Kanal ro'yxatda yo'q.");
        }
      } else if (operation.type === 'add_group') {
        if (!requiredGroups.includes(ctx.message.text)) {
          let link = ctx.message.text;
          const isAdmin = await checkBotAdmin(ctx, link);
          if (!isAdmin) {
            return ctx.reply('Bot is not admin in the provided group or channel ⚠️');
          }
          requiredGroups.push(ctx.message.text);
          saveData('required_groups.json', requiredGroups);
          await ctx.reply("Guruh muvaffaqiyatli qo'shildi.");
        } else {
          await ctx.reply("Guruh allaqachon ro'yxatda.");
        }
      }
      else if (operation.type === 'remove_group') {
        const index = requiredGroups.indexOf(ctx.message.text);
        if (index > -1) {
          requiredGroups.splice(index, 1);
          saveData('required_groups.json', requiredGroups);
          await ctx.reply('Guruh muvaffaqiyatli olib tashlandi.');
        } else {
          await ctx.reply("Guruh ro'yxatda yo'q.");
        }
      } else if (operation.type === "add_zayafka") {
        if (!requiredprivategroupsandchannels.includes(ctx.message.text)) {
          requiredprivategroupsandchannels.push(ctx.message.text);
          saveData("required_private.json", requiredprivategroupsandchannels);
          await ctx.reply("Link added successfully.")
        } else {
          await ctx.reply("Link is already in the list.")
        }
      } else if (operation.type === "remove_zayafka") {
        const index = requiredprivategroupsandchannels.indexOf(ctx.message.text);
        if (index > -1) {
          requiredprivategroupsandchannels.splice(index, 1);
          saveData("required_private.json", requiredprivategroupsandchannels)
          await ctx.reply("Link removed successfully.")
        } else {
          await ctx.reply("Link is not in the list.")
        }
      } else if (operation.type === 'send_message') {
        let totalSent = 0;
        let successfulDeliveries = 0;
        let failedDeliveries = 0;

        // Reset the message statistics
        messageStats.totalSent = 0;
        messageStats.successfulDeliveries = 0;
        messageStats.failedDeliveries = 0;

        // Send initial progress message
        const progressMessage = await ctx.reply(`Started sending messages...\nFailed: 0 | Success: 0 | Total: 0`);

        // Function to send messages in batches asynchronously
        const sendMessagesNonBlocking = (userIDs, concurrentLimit, ctx) => {
          let currentIndex = 0;

          const processBatch = async () => {
            const batch = userIDs.slice(currentIndex, currentIndex + concurrentLimit);
            currentIndex += concurrentLimit;

            // Process the current batch concurrently
            await Promise.all(batch.map(async (id) => {
              try {
                await bot.telegram.forwardMessage(id, ctx.message.chat.id, ctx.message.message_id);
                totalSent++;
                successfulDeliveries++;
              } catch (e) {
                if (e.response && e.response.error_code === 429) {
                  const retryAfter = e.response.parameters.retry_after || 1;
                  console.warn(`Rate limit exceeded. Retrying after ${retryAfter} seconds...`);
                  await new Promise(res => setTimeout(res, retryAfter * 1000));
                  try {
                    await bot.telegram.forwardMessage(id, ctx.message.chat.id, ctx.message.message_id);
                    totalSent++;
                    successfulDeliveries++;
                  } catch (retryError) {
                    totalSent++;
                    failedDeliveries++;
                    console.error(`Failed to send message to user ${id} after retry:`, retryError.message);
                  }
                } else {
                  totalSent++;
                  failedDeliveries++;
                  console.error(`Failed to send message to user ${id}:`, e.message);
                }
              }
            }));

            // Update progress after processing each batch
            await bot.telegram.editMessageText(
              ctx.chat.id,
              progressMessage.message_id,
              null,
              `Failed: ${failedDeliveries} | Success: ${successfulDeliveries} | Total: ${totalSent}/${userIDs.length}`
            );

            // Continue processing if there are more batches
            if (currentIndex < userIDs.length) {
              setTimeout(processBatch, 0); // Schedule the next batch
            } else {
              // Final "Done" message when all batches are complete
              updateMessageStats();
              bot.telegram.editMessageText(
                ctx.chat.id,
                progressMessage.message_id,
                null,
                `Done! Messages sent.\nFailed: ${failedDeliveries} | Success: ${successfulDeliveries} | Total: ${totalSent}\nLast updated: ${formatDate(messageStats.lastUpdated)}`
              );
            }
          };

          // Start processing batches
          processBatch();
        };

        const updateMessageStats = () => {
          messageStats.totalSent = totalSent;
          messageStats.successfulDeliveries = successfulDeliveries;
          messageStats.failedDeliveries = failedDeliveries;
          messageStats.lastUpdated = new Date();
          saveData('message_stats.json', messageStats);
        };

        // Start sending messages in a non-blocking way
        const concurrentLimit = 30; // Set the number of concurrent messages

        try {
          sendMessagesNonBlocking(userIDs, concurrentLimit, ctx); // No await to keep it non-blocking
        } catch (error) {
          console.error('Error during message sending operation:', error);
          await ctx.reply("There was an error sending messages.");
        } finally {
          delete currentOperation[ctx.from.id]; // Clean up the operation
        }
      }




    } catch (error) {
      console.error('Error handling message:', error);
      await ctx.reply('An error occurred while processing your request.');
    }
  } else if (ctx.message.forward_from) {
    const message = ctx.message;
    for (const id of userIDs) {
      try {
        await bot.telegram.forwardMessage(id, message.chat.id, message.message_id);
      } catch (error) {
        console.error(`Failed to forward message to user ${id}:`, error);
      }
    }
  }
});






// Launch the bot only once
bot.launch()
  .then(() => console.log('Bot is running'))
  .catch((err) => console.error('Failed to launch bot:', err));
