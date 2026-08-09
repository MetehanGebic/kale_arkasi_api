import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Herkese açık, güvenlik gerekirse kısıtlanabilir
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Yeni istemci bağlandı: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`[Socket] İstemci ayrıldı: ${socket.id}`);
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
