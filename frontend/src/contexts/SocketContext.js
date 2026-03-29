import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user }   = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;

    const s = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', { transports: ['websocket'] });

    s.on('connect', () => console.log('Socket connected:', s.id));

    s.on('class_notification', (data) => {
      toast.custom(t => (
        <div style={{ background:'#1e293b', color:'#fff', padding:'12px 16px', borderRadius:'10px', display:'flex', gap:'10px', alignItems:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
          <span>🎓</span>
          <div>
            <div style={{ fontWeight:600, fontSize:'0.88rem' }}>{data.message}</div>
            {data.link && <a href={data.link} target="_blank" rel="noopener noreferrer" style={{ color:'#38bdf8', fontSize:'0.78rem' }}>Join now →</a>}
          </div>
        </div>
      ), { duration:8000 });
    });

    s.on('new_assignment', (data) => {
      toast(`📋 New assignment: "${data.assignment?.title}"`, { duration:6000, icon:'📋' });
    });

    s.on('new_quiz', (data) => {
      toast(`📝 New quiz available: "${data.quiz?.title}"`, { duration:6000, icon:'📝' });
    });

    s.on('announcement_notification', (data) => {
      toast(`📢 ${data.title}`, { duration:5000 });
    });

    s.on('enrolled_in_course', (data) => {
      toast.success(`You've been enrolled in "${data.courseTitle}"!`, { duration:5000 });
    });

    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  const joinRoom  = (roomId) => socket?.emit('join_room', roomId);
  const leaveRoom = (roomId) => socket?.emit('leave_room', roomId);

  return (
    <SocketContext.Provider value={{ socket, joinRoom, leaveRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);