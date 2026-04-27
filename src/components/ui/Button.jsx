import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  ...props 
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-accent to-accent-secondary text-white shadow-accent hover:shadow-accent-lg',
    secondary: 'bg-transparent border border-border text-foreground hover:bg-muted',
    ghost: 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
    outline: 'border-2 border-accent text-accent hover:bg-accent/5'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={twMerge(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </motion.button>
  );
};
