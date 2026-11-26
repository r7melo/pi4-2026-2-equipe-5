import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface IconActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  label: string;
  tone?: "neutral" | "destructive" | "warning";
  size?: "sm" | "md";
}

const TONE_CLASSES: Record<NonNullable<IconActionButtonProps["tone"]>, string> = {
  neutral: "text-muted-foreground hover:text-foreground hover:bg-muted",
  destructive:
    "text-muted-foreground hover:text-destructive hover:bg-destructive-light",
  warning: "text-muted-foreground hover:text-warning hover:bg-warning-light",
};

const SIZE_CLASSES: Record<NonNullable<IconActionButtonProps["size"]>, string> = {
  sm: "controle-compacto w-7 h-7",
  md: "w-8 h-8",
};

export const IconActionButton = React.forwardRef<
  HTMLButtonElement,
  IconActionButtonProps
>(
  (
    {
      label,
      title,
      tone = "neutral",
      size = "md",
      type = "button",
      className,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0",
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

IconActionButton.displayName = "IconActionButton";
