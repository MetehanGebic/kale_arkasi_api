import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { registerChatHandlers } from '../sockets/chatHandler.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Herkese açık, güvenlik gerekirse kısıtlanabilir
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Yetkilendirme hatası: Token bulunamadı'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar');
      socket.user = decoded; // { id, email, username }
      next();
    } catch (err) {
      return next(new Error('Yetkilendirme hatası: Geçersiz token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Yeni istemci bağlandı: ${socket.user.username} (${socket.id})`);
    
    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket] İstemci ayrıldı: ${socket.user.username}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io başlatılmamış!');
  }
  return io;
};
