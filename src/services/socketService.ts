import {io, Socket} from 'socket.io-client';
import {API_BASE_URL} from '../api/client';

let socket: Socket | null = null;

export function connectSocket(userId: string): Socket {
  if (socket?.connected) return socket;

  const baseUrl = API_BASE_URL.replace('/api', '');
  socket = io(baseUrl, {
    query: {userId},
    transports: ['websocket'],
  });

  socket.on('connect', () => console.log('[Socket] Connected'));
  socket.on('disconnect', () => console.log('[Socket] Disconnected'));
  socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinChat(chatId: string): void {
  socket?.emit('chat:join', chatId);
}

export function leaveChat(chatId: string): void {
  socket?.emit('chat:leave', chatId);
}

export function sendChatMessage(chatId: string, message: any): void {
  socket?.emit('chat:message', {chatId, message});
}

export function sendTypingIndicator(chatId: string, userId: string): void {
  socket?.emit('chat:typing', {chatId, userId});
}

export function sendNotification(userId: string, notification: any): void {
  socket?.emit('notification', {userId, notification});
}

export function onChatMessage(callback: (message: any) => void): () => void {
  socket?.on('chat:message', callback);
  return () => socket?.off('chat:message', callback);
}

export function onTyping(callback: (data: {chatId: string; userId: string}) => void): () => void {
  socket?.on('chat:typing', callback);
  return () => socket?.off('chat:typing', callback);
}

export function onNotification(callback: (notification: any) => void): () => void {
  socket?.on('notification', callback);
  return () => socket?.off('notification', callback);
}

export function onUserOnline(callback: (data: {userId: string; online: boolean}) => void): () => void {
  socket?.on('user:online', callback);
  return () => socket?.off('user:online', callback);
}
