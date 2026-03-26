interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-gray-800 bg-gray-900 p-6 ${className}`}>
      {children}
    </div>
  );
}
