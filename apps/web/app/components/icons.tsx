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

// Icônes de la barre de navigation principale (voir nav-bar.tsx). Couleur
// toujours héritée (currentColor) : le vert carbone est réservé au bénéfice
// mesuré (règle du design system), jamais à une icône de navigation neutre.
export function IconRoute({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M6 8.5V13a4 4 0 004 4h4" />
    </svg>
  );
}

export function IconLeaf({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M6 20C4 12 9 4 20 4c0 11-8 16-14 16z" />
      <path d="M6 20c1-4 4-8 10-11" />
    </svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
    </svg>
  );
}
