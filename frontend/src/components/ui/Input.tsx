import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, icon, id, type = "text", ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-slate-700"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={!!error}
            className={cn(
              "w-full rounded-lg border bg-slate-50 border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed",
              icon ? "pl-10" : "px-4",
              error && "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-100",
              className
            )}
            {...props}
          />
        </div>

        {error ? (
          <p className="text-xs text-red-600 font-medium mt-1 animate-fadeIn">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
