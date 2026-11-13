import {
  Armchair, ArrowUpDown, Bath, Briefcase, Bug, Car, Coffee, DoorOpen, Droplet, Droplets, Fan, Footprints, Hammer, Lightbulb,
  PartyPopper, Presentation, Signpost, Sparkles, SprayCan, Trash2, Wind, Wrench, ParkingSquare, Users, HeartPulse, Pill,
  CalendarDays, MapPin, Building2, UtensilsCrossed, DoorClosed, ConciergeBell, Sofa, TrafficCone, Cable, Footprints as StairsIcon, LogIn, Armchair as Seat, type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  wind: Wind, lightbulb: Lightbulb, droplets: Droplets, "door-open": DoorOpen, hammer: Hammer, armchair: Armchair,
  "arrow-up-down": ArrowUpDown, car: Car, fan: Fan, signpost: Signpost, wrench: Wrench, briefcase: Briefcase,
  presentation: Presentation, bath: Bath, coffee: Coffee, footprints: Footprints, "party-popper": PartyPopper,
  trash: Trash2, droplet: Droplet, "spray-can": SprayCan, bug: Bug, sparkles: Sparkles,
};
export const ICON_NAMES = Object.keys(CATEGORY_ICONS);

export const AREA_ICONS: Record<string, LucideIcon> = {
  PARKING: ParkingSquare, MEETING_ROOMS: Users, RESTROOMS: Bath, PHARMACY: Pill, CLINIC: HeartPulse, EVENT_AREA: CalendarDays,
  OFFICE: Building2, PANTRY: UtensilsCrossed, CORRIDOR: Footprints, ELEVATOR_LOBBY: ArrowUpDown, OTHER: MapPin,
  STAIRCASE: StairsIcon, ENTRANCE: LogIn, RECEPTION: ConciergeBell, WAITING_AREA: Seat, PARKING_GATE: TrafficCone,
  COMMON_AREA: Sofa, UTILITY_ROOM: Cable,
};

/** Icons for specific location kinds. */
export const LOCATION_ICONS: Record<string, LucideIcon> = {
  ROOM: DoorClosed, OFFICE: Briefcase, MEETING_ROOM: Users, PARKING_SECTION: ParkingSquare, ELEVATOR: ArrowUpDown, ENTRANCE: LogIn, LANDMARK: MapPin, COLUMN: Building2,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const I = CATEGORY_ICONS[name] ?? Wrench;
  return <I className={className} aria-hidden="true" />;
}
export function AreaIcon({ kind, className }: { kind: string; className?: string }) {
  const I = AREA_ICONS[kind] ?? MapPin;
  return <I className={className} aria-hidden="true" />;
}
