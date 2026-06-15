// Clean line icons per category (lucide-react — NOT emoji).
// Used on the product page and category pages. Every icon below is verified to
// exist in the installed lucide-react build.
import {
  Droplet,
  Droplets,
  PaintBucket,
  Palette,
  Brush,
  Paintbrush,
  Pen,
  Pencil,
  Notebook,
  NotebookPen,
  BookOpen,
  Baby,
  Gamepad2,
  ToyBrick,
  Wrench,
  Briefcase,
  Eraser,
  Ruler,
  Sticker,
  Package,
  Frame,
  Gift,
  Sparkles,
  PartyPopper,
  Battery,
  Dices,
  KeyRound,
  GraduationCap,
  Backpack,
  Shapes,
  FlaskConical,
  FileText,
  Calculator,
  Hand,
} from "lucide-react";

// Exact category name → icon (categories come from the backend in Georgian).
const MAP = {
  "აკვარელი": Droplet,
  "აკრილის საღებავი": PaintBucket,
  "ბლოკნოტები": Notebook,
  "გასაფორმებელი": Sparkles,
  "ზეთის საღებავი": Palette,
  "კალმები": Pen,
  "პენლები": Pencil,
  "რვეულები": BookOpen,
  "საახალწლო": Gift,
  "საბავშვო": Baby,
  "სათამაშოები": Gamepad2,
  "სამუშაო იარაღები": Wrench,
  "საოფისე": Briefcase,
  "საშლელ-სათლელი": Eraser,
  "სახაზავი ინსტრუმენტები": Ruler,
  "სკეჩბუქი": NotebookPen,
  "სტიკერები": Sticker,
  "სხვა": Package,
  "ტილოები": Frame,
  "ფლომასტერები და ფერადი ფანქრები": Pencil,
  "ფრჩხილები": Hand,
  "ფუნჯები და პალიტრის დანები": Brush,
  "სქუიშები და ტყლარწები": ToyBrick,
  "სადღესასწაულო": PartyPopper,
  "ელემენტი": Battery,
  "სამაგიდო თამაშები": Dices,
  "ტაროები": Sparkles,
  "ბრელოკი": KeyRound,
  "პიგმენტები": Droplets,
  "მოლბერტები": Frame,
  "გუაშის საღებავები": Palette,
  "პალიტრები": Palette,
  "სხვა სამხატვრო მასალები": Palette,
  "სხვა სასკოლო ნივთები": Backpack,
  "თიხები": Shapes,
  "პლასტელინები": Shapes,
  "საღებავების მედიუმები": FlaskConical,
  "სამხატვრო ნახშირი": Pencil,
  "პასტელები": Palette,
  "ფორმატები და სამხატვრო ფურცლები": FileText,
  "კალკულატორები": Calculator,
};

// Keyword fallback so an unmapped/new category still gets a sensible icon.
const KEYWORDS = [
  ["საღებავ", Palette],
  ["ფუნჯ", Brush],
  ["ფანქ", Pencil],
  ["კალ", Pen],
  ["რვე", BookOpen],
  ["ბლოკ", Notebook],
  ["ტილო", Frame],
  ["მოლბერტ", Frame],
  ["სათამაშ", Gamepad2],
  ["საბავშვ", Baby],
  ["სასკოლ", Backpack],
  ["საოფის", Briefcase],
  ["სტიკერ", Sticker],
  ["ხაზავ", Ruler],
  ["კალკულ", Calculator],
];

function pickIcon(name) {
  const key = String(name || "").trim();
  if (MAP[key]) return MAP[key];
  for (const [kw, icon] of KEYWORDS) {
    if (key.includes(kw)) return icon;
  }
  return Paintbrush; // art-store default
}

export default function CategoryIcon({ name, size = 20, ...props }) {
  const Icon = pickIcon(name);
  return <Icon size={size} aria-hidden="true" {...props} />;
}
