import type { HTMLAttributes } from 'react';

interface BrandLogoProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'large' | 'medium';
}

export default function BrandLogo({ size = 'medium', className = '', ...props }: BrandLogoProps) {
  const isLarge = size === 'large';

  return (
    <div
      className={`flex items-center justify-center gap-3 ${className}`.trim()}
      {...props}
    >
      <img
        src="./nexnote-mark.png"
        alt=""
        aria-hidden="true"
        className={`${isLarge ? 'h-16 w-16' : 'h-12 w-12'} object-contain`}
      />
      <span className={`font-semibold tracking-tight text-white ${isLarge ? 'text-3xl' : 'text-2xl'}`}>
        NexNote
      </span>
    </div>
  );
}
