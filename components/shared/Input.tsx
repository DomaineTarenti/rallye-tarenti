import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-400">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
        {...props}
      />
    </div>
  )
);

Input.displayName = "Input";
