import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  onClick, type = 'button', id, className = '', ...props
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    ghost: 'btn-ghost',
  };

  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  return (
    <motion.button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </motion.button>
  );
}
