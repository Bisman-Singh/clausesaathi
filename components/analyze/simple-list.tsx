import { Section } from "@/components/ui/section";

export interface SimpleListProps {
  id: string;
  title: string;
  items: string[];
  ordered?: boolean;
}

/** A titled list section that disappears when it has nothing to say. */
export function SimpleList({ id, title, items, ordered = true }: SimpleListProps) {
  if (items.length === 0) return null;
  const className = `flex flex-col gap-2 pl-5 ${ordered ? "list-decimal" : "list-disc"}`;
  const content = items.map((item, index) => <li key={index}>{item}</li>);
  return (
    <Section id={id} title={title}>
      {ordered ? (
        <ol className={className}>{content}</ol>
      ) : (
        <ul className={className}>{content}</ul>
      )}
    </Section>
  );
}
