interface EditionLogoProps {
  editionId: string;
  size?: number;
  logoUrl?: string;
}

export default function EditionLogo({ editionId, size = 24, logoUrl }: EditionLogoProps) {
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
