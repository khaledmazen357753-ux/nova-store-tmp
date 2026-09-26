import type { ReactNode, SVGProps } from "react";

/**
 * أيقونات بستايل Iconsax (Rounded / Linear افتراضياً)
 * المرجع رقم 3 في DESIGN_REFERENCE.md — شبكة 24px، حواف دائرية
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function Fill({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

/* ===== UI icons (Linear) ===== */

export const BoltIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M13 2 5 13.5h5.5L10 22l8-10.5h-5.5L13 2Z" />
  </Stroke>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 3 5.5 5.6v4.9c0 4.4 2.8 7.3 6.5 8.9 3.7-1.6 6.5-4.5 6.5-8.9V5.6L12 3Z" />
    <path d="m9.2 11.6 2 2 3.6-4" />
  </Stroke>
);

export const GamepadIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M8.2 7.5h7.6a4.7 4.7 0 0 1 4.6 5.6l-.5 2.8a2.8 2.8 0 0 1-5 1.2l-1.3-1.6h-3.2l-1.3 1.6a2.8 2.8 0 0 1-5-1.2l-.5-2.8a4.7 4.7 0 0 1 4.6-5.6Z" />
    <path d="M8 10.2v3M6.5 11.7h3" />
    <circle cx="15.6" cy="10.7" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="17.7" cy="12.8" r="0.7" fill="currentColor" stroke="none" />
  </Stroke>
);

export const HeadphonesIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4.5 14v-2.2a7.5 7.5 0 0 1 15 0V14" />
    <rect x="3.2" y="13.6" width="4.2" height="6.2" rx="1.8" />
    <rect x="16.6" y="13.6" width="4.2" height="6.2" rx="1.8" />
  </Stroke>
);

export const SpeakerIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="6" y="3" width="12" height="18" rx="3" />
    <circle cx="12" cy="14.5" r="3.2" />
    <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
  </Stroke>
);

export const StandIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="7.5" y="3" width="9" height="13.5" rx="2.5" />
    <path d="M12 16.5V20" />
    <path d="M8.5 20.5h7" />
    <path d="M9.5 6.5h5" />
  </Stroke>
);

export const BagIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5.8 8h12.4l1.1 11.2a1.8 1.8 0 0 1-1.8 1.8H6.5a1.8 1.8 0 0 1-1.8-1.8L5.8 8Z" />
    <path d="M8.8 10.5V6.7a3.2 3.2 0 0 1 6.4 0v3.8" />
  </Stroke>
);

export const SearchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.8-3.8" />
  </Stroke>
);

export const MenuIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Stroke>
);

export const XIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Stroke>
);

export const TruckIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3.5 16.5V7a1 1 0 0 1 1-1h8.5a1 1 0 0 1 1 1v9.5" />
    <path d="M14 9.5h3a2 2 0 0 1 1.6.8l1.4 2a2 2 0 0 1 .4 1.2v3H3" />
    <circle cx="7.3" cy="17.8" r="1.6" />
    <circle cx="16.8" cy="17.8" r="1.6" />
  </Stroke>
);

export const RefreshIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v4.5h-4.5" />
  </Stroke>
);

export const CheckIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Stroke>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.3 2.4 2.4 4.6-5" />
  </Stroke>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m7 10 5 5 5-5" />
  </Stroke>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Stroke>
);

export const PhoneIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M10.5 5.5h3" />
    <circle cx="12" cy="18" r="0.8" fill="currentColor" stroke="none" />
  </Stroke>
);

export const MapPinIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 21.5S5.5 15.6 5.5 10.5a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10.5" r="2.4" />
  </Stroke>
);

export const MailIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m4 7.5 8 6 8-6" />
  </Stroke>
);

export const ClockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Stroke>
);

export const CameraIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.2-1.8h5.6L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z" />
    <circle cx="12" cy="12.3" r="3.4" />
  </Stroke>
);

export const GiftIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="4" y="8" width="16" height="4" rx="1" />
    <path d="M6 12v7a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19v-7" />
    <path d="M12 8v12.5" />
    <path d="M12 8s-.6-3.5-2.9-3.5a1.9 1.9 0 0 0 0 3.5Z" />
    <path d="M12 8s.6-3.5 2.9-3.5a1.9 1.9 0 0 1 0 3.5Z" />
  </Stroke>
);

export const TagIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3.6 12.3V5.6a2 2 0 0 1 2-2h6.7a2 2 0 0 1 1.4.6l6.1 6.1a2 2 0 0 1 0 2.8l-5.3 5.3a2 2 0 0 1-2.8 0l-6.1-6.1a2 2 0 0 1-.6-1.4Z" />
    <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
  </Stroke>
);

export const LockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Stroke>
);

export const UserIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20a7.5 7.5 0 0 1 14 0" />
  </Stroke>
);

export const GridIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </Stroke>
);

export const HomeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 10.5 12 4l7 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 19v-8.5" />
    <path d="M9.5 20.5v-6h5v6" />
  </Stroke>
);

export const CashIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3" y="6.5" width="18" height="11" rx="2.5" />
    <circle cx="12" cy="12" r="2.6" />
    <circle cx="6.6" cy="9.6" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="17.4" cy="14.4" r="0.7" fill="currentColor" stroke="none" />
  </Stroke>
);

export const MinusIcon = (p: IconProps) => (
  <Stroke strokeWidth={2} {...p}>
    <path d="M5 12h14" />
  </Stroke>
);

export const PlusIcon = (p: IconProps) => (
  <Stroke strokeWidth={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);

export const SparklesIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m12 4.5 1.8 4.5 4.7 1.8-4.7 1.8L12 17l-1.8-4.4-4.7-1.8 4.7-1.8L12 4.5Z" />
    <path d="m19 15.5.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
  </Stroke>
);

/* ===== Filled / brand icons ===== */

export const StarIcon = ({ size = 16, ...p }: IconProps) => (
  <Fill size={size} {...p}>
    <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4l-5.8 3 1.1-6.4L2.6 9.4l6.5-.9L12 2.6Z" />
  </Fill>
);

export const FireIcon = ({ size = 24, ...p }: IconProps) => (
  <Fill size={size} {...p}>
    <path d="M12 2.5c.5 2.7 2.2 3.9 3.7 5.5 1.4 1.5 2.3 3 2.3 5A6 6 0 0 1 6 13c0-1.7.7-3.2 1.8-4.4.2 1.1.8 2 1.8 2.5C9.4 7.7 10.4 5 12 2.5Z" />
  </Fill>
);

export const PlayIcon = ({ size = 24, ...p }: IconProps) => (
  <Fill size={size} {...p}>
    <path d="M8.5 5.8a1 1 0 0 1 1.5-.87l9 6.2a1 1 0 0 1 0 1.74l-9 6.2a1 1 0 0 1-1.5-.87V5.8Z" />
  </Fill>
);

export const WhatsAppIcon = ({ size = 24, ...p }: IconProps) => (
  <Fill size={size} {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 2.2a7.8 7.8 0 0 1 0 15.6 7.8 7.8 0 0 1-3.9-1l-.4-.25-3 .77.8-2.9-.25-.4A7.8 7.8 0 0 1 12 4.2Zm-3.2 4c-.2 0-.5 0-.7.3-.24.3-.9.86-.9 2.06s.9 2.4 1 2.6c.2.2 1.8 2.9 4.5 3.9 2.2.86 2.7.7 3.2.64.5-.06 1.5-.6 1.7-1.2.2-.6.2-1.1.15-1.2-.06-.1-.27-.16-.56-.3l-2-.95c-.27-.1-.47-.16-.67.16l-.95 1.2c-.2.2-.4.24-.7.1a6.5 6.5 0 0 1-3.3-2.9c-.24-.42.02-.5.2-.7l.7-.85c.15-.2.2-.34.3-.55.1-.2.05-.4-.02-.55l-.9-2.1c-.2-.5-.4-.5-.6-.5l-.35-.03Z" />
  </Fill>
);

export const InstagramIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="3.8" />
    <circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none" />
  </Stroke>
);

export const TikTokIcon = ({ size = 24, ...p }: IconProps) => (
  <Fill size={size} {...p}>
    <path d="M16.6 3c.4 2.3 1.8 3.7 4.4 3.9V10c-1.6 0-3.1-.5-4.4-1.3v6.6a6.3 6.3 0 1 1-6.3-6.3c.33 0 .66.02 1 .08v3.3a3.2 3.2 0 1 0 2.2 3V3h3.1Z" />
  </Fill>
);
