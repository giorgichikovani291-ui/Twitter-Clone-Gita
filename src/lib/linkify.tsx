import Link from "next/link";

export function linkifyContent(content: string): React.ReactNode[] {
  const parts = content.split(/(#[\p{L}0-9_]+|@[a-zA-Z0-9_]+)/gu);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      return (
        <Link
          key={i}
          href={`/explore?q=${encodeURIComponent(part)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-accent hover:underline"
        >
          {part}
        </Link>
      );
    }
    if (part.startsWith("@")) {
      return (
        <Link
          key={i}
          href={`/profile/${part.slice(1)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-accent hover:underline"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
}
