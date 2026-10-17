import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-50 disabled:pointer-events-none active:scale-95 cursor-pointer";

    const variantStyles = {
      primary: "bg-primary hover:bg-primary-hover text-primary-foreground shadow-sm",
      secondary: "bg-muted hover:bg-border-subtle text-foreground-secondary",
      outline: "border border-border-strong text-foreground-muted bg-surface hover:bg-surface-subtle shadow-sm",
      ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
      danger: "text-muted-foreground hover:bg-destructive-light hover:text-destructive",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs gap-1.5",
      md: "px-4 py-2 text-sm gap-2",
      lg: "px-6 py-2.5 text-base gap-2.5",
      icon: "p-2",
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
