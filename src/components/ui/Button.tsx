import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  secondary: 'bg-[#111f3d] hover:bg-[#162549] text-slate-200 border border-[#1e2a3a]',
  ghost: 'hover:bg-[#0d1730] text-slate-400 hover:text-slate-200',
  danger: 'bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-800/40',
  outline: 'border border-[#1e2a3a] hover:bg-[#0d1730] text-slate-300',
};

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
