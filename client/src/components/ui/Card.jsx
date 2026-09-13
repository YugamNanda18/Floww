import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, onClick, id }) {
  return (
    <motion.div
      id={id}
      onClick={onClick}
      whileHover={hover ? { y: -2, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' } : {}}
      transition={{ duration: 0.15 }}
      className={`card ${hover ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
