import { Section } from "@/components/ui/section";

export interface SimpleListProps {
  id: string;
  title: string;
  items: string[];
}

/** A titled, numbered list section that disappears when it has nothing to say. */
export function SimpleList({ id, title, items }: SimpleListProps) {
  if (items.length === 0) return null;
  return (
    <Section id={id} title={title}>
      <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-medium marker:text-accent">
        {items.map((item, index) => (
          <li key={index} className="pl-1">
            {item}
          </li>
        ))}
      </ol>
    </Section>
  );
}
