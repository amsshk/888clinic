type Props = { className?: string; compact?: boolean };

export function ClinicLogo({ className, compact = false }: Props) {
  return (
    <span
      role="img"
      aria-label="888 Clinic"
      className={`inline-flex items-center text-gold ${className ?? ""}`}
    >
      <span className="font-display text-[2rem] leading-none tracking-[0.08em]">888</span>
      {!compact && (
        <span className="ml-3 border-l border-gold/35 pl-3 text-[0.58rem] uppercase leading-[1.25] tracking-[0.34em]">
          Clinic
        </span>
      )}
    </span>
  );
}
