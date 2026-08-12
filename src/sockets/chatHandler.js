import * as economyService from '../services/economyService.js';
import { prisma } from '../core/db.js';

// In-memory store for red cards: { roomName: { username: expirationTimeMs } }
const redCards = {};

// In-memory store for Capo mode messages left: { roomName: { username: messagesLeft } }
const capoStates = {};

// In-memory store for Polls: { matchId: { pollId: { question, options: [{id, text, votes}], votedUsers: {username: optionId} } } }
const polls = {};

const STORE_PRICES = {
  cay: 50,
  capo: 400,
  red_card: 100,
  madde: 50,
  mesale: 200,
  cekirdek: 30,
  gozluk: 25,
  davul: 100,
  kufur: 30
};

const STORE_ASSETS = {
  cay: 'assets/images/store/cay.png',
  capo: 'assets/images/store/capo.png',
  red_card: 'assets/images/store/kart.png',
  madde: 'assets/images/store/madde.png',
  mesale: 'assets/images/store/mesale.gif',
  cekirdek: 'assets/images/store/cekirdek.gif',
  gozluk: 'assets/images/store/gozluk.png',
  davul: 'assets/images/store/davul.png',
  kufur: 'assets/images/store/kufur.png'
};

export const registerChatHandlers = (io, socket) => {
  const user = socket.user; // Set by JWT middleware

  socket.on('join_match', (matchId) => {
    socket.join(matchId);
    console.log(`[Chat] ${user.username} joined match ${matchId}`);
    
    // Rıza Baba greeting
    setTimeout(() => {
      io.to(matchId).emit('chat_message', {
        id: Date.now().toString(),
        sender: 'Kahveci Rıza',
        text: `Hoşgeldin ${user.username}! Çaylar şirketten değil ha, pamuk eller cebe!`,
        isSystem: true,
        timestamp: new Date().toISOString()
      });
    }, 1000);

    // Initial Test Poll (Sistem Anketi)
    if (!polls[matchId]) {
      polls[matchId] = {};
      const pollId = 'poll_first_goal';
      polls[matchId][pollId] = {
        id: pollId,
        question: 'İlk Golü Kim Atar?',
        options: [
          { id: 'home', text: 'Ev Sahibi', votes: 0 },
          { id: 'away', text: 'Deplasman', votes: 0 },
          { id: 'none', text: 'Gol Olmaz', votes: 0 }
        ],
        votedUsers: {} // username -> optionId
      };
      setTimeout(() => {
        io.to(matchId).emit('chat_message', {
          id: Date.now().toString(),
          sender: 'Sistem',
          text: 'Tahminleri alalım!',
          isSystem: true,
          isPoll: true,
          pollData: polls[matchId][pollId],
          timestamp: new Date().toISOString()
        });
      }, 3000);
    } else {
       // If poll exists, maybe send it to the joining user so they see the current state
       const existingPoll = polls[matchId]['poll_first_goal'];
       if (existingPoll) {
         setTimeout(() => {
           socket.emit('chat_message', {
             id: Date.now().toString(),
             sender: 'Sistem',
             text: 'Tahminleri alalım!',
             isSystem: true,
             isPoll: true,
             pollData: existingPoll,
             timestamp: new Date().toISOString()
           });
         }, 3000);
       }
    }
  });

  socket.on('leave_match', (matchId) => {
    socket.leave(matchId);
    console.log(`[Chat] ${user.username} left match ${matchId}`);
  });

  socket.on('send_message', (data) => {
    const { matchId, text, isCapo } = data;
    if (!matchId || !text) return;

    // Check red card status
    if (redCards[matchId] && redCards[matchId][user.username]) {
      const expiration = redCards[matchId][user.username];
      if (Date.now() < expiration) {
        socket.emit('socket_error', { message: 'Kırmızı kart gördünüz, şu an mesaj atamazsınız!' });
        return;
      } else {
        delete redCards[matchId][user.username];
      }
    }

    let isCapoMessage = false;

    // Check if user is using capo
    if (isCapo) {
       if (capoStates[matchId] && capoStates[matchId][user.username] > 0) {
         capoStates[matchId][user.username] -= 1;
         isCapoMessage = true;
       }
    }

    const messagePayload = {
      id: Date.now().toString(),
      sender: user.username,
      text: text,
      isSystem: false,
      isCapo: isCapoMessage,
      timestamp: new Date().toISOString()
    };

    io.to(matchId).emit('chat_message', messagePayload);

    // Rıza Baba reply logic
    if (text.toLowerCase().includes('selam') && !isCapoMessage) {
      setTimeout(() => {
        io.to(matchId).emit('chat_message', {
          id: Date.now().toString(),
          sender: 'Kahveci Rıza',
          text: `Aleykümselam ${user.username}, geç otur boş masa var.`,
          isSystem: true,
          timestamp: new Date().toISOString()
        });
      }, 1500);
    }
  });

  socket.on('buy_addon', async (data) => {
    const { matchId, type, target } = data;
    const price = STORE_PRICES[type];
    
    if (!price) {
      socket.emit('socket_error', { message: 'Geçersiz eklenti!' });
      return;
    }

    try {
      // Deduct tea
      await economyService.deductTea(user.id, price);
      
      // Handle special logic
      let text = '';
      if (type === 'red_card' && target) {
        if (!redCards[matchId]) redCards[matchId] = {};
        if (redCards[matchId][target] && Date.now() < redCards[matchId][target]) {
           socket.emit('socket_error', { message: 'Bu kullanıcı zaten kırmızı kartlı!' });
           return;
        }
        redCards[matchId][target] = Date.now() + 30000; // 30 seconds
        text = `${target} 30 saniye susturuldu!`;
      } else if (type === 'capo') {
        if (!capoStates[matchId]) capoStates[matchId] = {};
        capoStates[matchId][user.username] = (capoStates[matchId][user.username] || 0) + 3; // 3 messages
        text = `${user.username} Amigo modunu aktifleştirdi!`;
        // We emit to the user only because Capo state shouldn't flood the chat
        socket.emit('addon_event', {
          id: Date.now().toString(),
          sender: 'Sistem',
          text: text,
          isSystem: true,
          storeAsset: STORE_ASSETS[type],
          type: type,
          timestamp: new Date().toISOString()
        });
        return; // Don't broadcast Capo message to everyone
      } else if (type === 'madde') {
         text = `${user.username} sahaya yabancı madde fırlattı!`;
      } else if (type === 'cay') {
         text = `${user.username} herkese çay ısmarladı!`;
      } else if (type === 'cekirdek') {
         text = `${user.username} çekirdek çitliyor!`;
      } else if (type === 'davul') {
         text = `${user.username} tribünde davul çalıyor!`;
      } else if (type === 'gozluk') {
         text = `${user.username} hakeme gözlük yolladı!`;
      } else if (type === 'kufur') {
         text = `${user.username} hakeme okkalı bir küfür etti!`;
      } else if (type === 'mesale') {
         text = `${user.username} meşale yaktı!`;
      } else {
         text = `${user.username} bir eşya kullandı!`;
      }

      // Broadcast addon event
      io.to(matchId).emit('addon_event', {
        id: Date.now().toString(),
        sender: 'Sistem',
        text: text,
        isSystem: true,
        storeAsset: STORE_ASSETS[type],
        type: type,
        target: target,
        timestamp: new Date().toISOString()
      });

    } catch (e) {
      if (e.code === 'INSUFFICIENT_FUNDS') {
        socket.emit('socket_error', { message: 'Yetersiz çay bakiyesi!' });
      } else {
        socket.emit('socket_error', { message: 'Eklenti alınırken hata oluştu.' });
      }
    }
  });

  socket.on('submit_poll_vote', (data) => {
    const { matchId, pollId, optionId } = data;
    if (!polls[matchId] || !polls[matchId][pollId]) return;

    const poll = polls[matchId][pollId];
    
    // Check if user already voted
    if (poll.votedUsers[user.username]) {
       socket.emit('socket_error', { message: 'Bu ankette zaten oy kullandınız!' });
       return;
    }

    // Register vote
    const option = poll.options.find(opt => opt.id === optionId);
    if (option) {
      option.votes += 1;
      poll.votedUsers[user.username] = optionId;

      // Broadcast updated poll state
      io.to(matchId).emit('poll_updated', {
        pollId: pollId,
        pollData: poll
      });
    }
  });
};
