import { BrainCircuit, Bug, Clapperboard, Gamepad2, Globe, Megaphone, Palette, Smartphone, type LucideProps } from "lucide-react";
import type { CategoryId } from "@/config/questionnaire";

const ICONS: Record<CategoryId, React.ComponentType<LucideProps>> = {
  desain: Palette,
  website: Globe,
  mobile: Smartphone,
  game: Gamepad2,
  ai_data: BrainCircuit,
  qa: Bug,
  konten: Clapperboard,
  marketing: Megaphone,
};

export function CategoryIcon({ id, ...props }: { id: CategoryId } & LucideProps) {
  const Icon = ICONS[id];
  return <Icon aria-hidden="true" {...props} />;
}
