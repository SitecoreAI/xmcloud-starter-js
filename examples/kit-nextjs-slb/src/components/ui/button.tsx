import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-none text-base font-medium transition-colors duration-200 ease-[cubic-bezier(0.48,0.14,0.2,0.69)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
        outline:
          'border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground',
        secondary: 'bg-dark text-white hover:bg-primary',
        tertiary:
          'bg-tertiary text-tertiary-foreground hover:bg-tertiary-hover',
        ghost: 'bg-transparent text-dark hover:bg-secondary hover:text-primary',
        link: 'h-auto text-primary underline-offset-4 hover:text-primary-hover hover:underline',
        topic:
          'bg-accent text-accent-foreground font-heading rounded-none px-4 py-2 text-sm font-medium hover:bg-tertiary',
        'rounded-white':
          'rounded-none bg-white text-dark hover:bg-secondary transition-colors duration-200',
      },
      size: {
        default: 'h-[50px] px-6 py-3',
        sm: 'h-10 rounded-none px-4 text-sm',
        lg: 'h-14 rounded-none px-8',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
