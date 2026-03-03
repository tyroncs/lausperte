interface EditionLogoProps {
  size?: number;
  logoUrl?: string;
}

export default function EditionLogo({ size = 24, logoUrl }: EditionLogoProps) {
  if (!logoUrl) return null;
  return (
    <img
      src={logoUrl}
      alt=""
      className="object-contain rounded"
      style={{ width: size, height: size }}
    />
  );
}
