import logoAsset from "../../assets/logo.jpg.asset.json";

type Props = { className?: string; compact?: boolean };

/**
 * 888clinic logo mark — clean image wordmark.
 */
export function ClinicLogo({ className, compact = false }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <img
        src={logoAsset.url}
        alt="888clinic logo"
        className="h-10 w-auto rounded-full object-contain"
      />
      {!compact && (
        <span className="font-display text-[1.7rem] leading-none tracking-tight text-gradient-gold">
          888
        </span>
      )}
    </span>

  );
}
