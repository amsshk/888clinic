type Props = {
  className?: string;
  compact?: boolean;
};

export function ClinicLogo({ className, compact = false }: Props) {
  return (
    <span className={`inline-flex shrink-0 items-center ${className ?? ""}`}>
      <img
        src="/images/888clinic-logo.png"
        alt="888 Clinic — Real results. Real confidence."
        width={compact ? 112 : 150}
        height={compact ? 87 : 117}
        decoding="async"
        className={compact ? "h-11 w-auto object-contain drop-shadow-none" : "h-14 w-auto object-contain drop-shadow-none md:h-16"}
      />
    </span>
  );
}
