// Placeholder socket hook — can be replaced with Socket.io for real-time updates
import { useEffect } from 'react';

export const useSocket = (event, handler) => {
  useEffect(() => {
    // In a future iteration, connect to Socket.io server for real-time payment status
    // const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000');
    // socket.on(event, handler);
    // return () => socket.off(event, handler);
  }, [event, handler]);
};
