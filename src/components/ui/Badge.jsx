import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export const Badge = ({ children, className, pulse = true }) => {
  return (
    <div className={twMerge(
      "inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5",
      className
    )}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
        </span>
      )}
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent font-semibold">
        {children}
      </span>
    </div>
  );
};
