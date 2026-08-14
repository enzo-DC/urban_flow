interface IconProps {
  className?: string;
}

const commonProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M5 7h14M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-9 0l1 12a1 1 0 001 1h6a1 1 0 001-1l1-12" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6l7-3z" />
    </svg>
  );
}
