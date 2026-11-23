import { Crosshair, Footprints, Goal, Hand, MapPin, MoveUpRight, Repeat2, Rocket, Share2, Shield, ShieldHalf, Zap } from "lucide-react";
import type { Topic } from "@/lib/lab/trainer";

const ICONS: Record<Topic["icon"], React.ComponentType<{ className?: string }>> = {
  pass: Repeat2, long: MoveUpRight, assist: Share2, target: Crosshair, goal: Goal, rocket: Rocket,
  dribble: Footprints, speed: Zap, shield: ShieldHalf, def: Shield, pos: MapPin, gk: Hand,
};
export function TopicIcon({ icon, className }: { icon: Topic["icon"]; className?: string }) {
  const I = ICONS[icon];
  return <I className={className} />;
}
