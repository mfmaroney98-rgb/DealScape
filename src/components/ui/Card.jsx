import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className, hover = true, featured = false, ...props }) => {
  return (
    <motion.div
      whileHover={hover ? { y: -5, shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" } : {}}
      className={twMerge(
        'relative bg-card border border-border rounded-2xl p-6 transition-all duration-300',
        featured && 'border-accent/30 shadow-accent/10 shadow-lg',
        className
      )}
      {...props}
    >
      {featured && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent rounded-2xl pointer-events-none" />
      )}
      {children}
    </motion.div>
  );
};
