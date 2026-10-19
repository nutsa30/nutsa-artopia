// ქვეკატეგორიის ფერადი ხატულა (lucide-react + Tailwind) — ადმინის ემოჯის ნაცვლად.
// ხატულა slug-ით ირჩევა; ახალ (Optimo-დან მოსულ) ქვეკატეგორიას სახელის სიტყვით
// ვუძებნით შესაფერისს, ბოლოს კი ზოგად ხატულას ვაძლევთ. ფერი მთავარი კატეგორიისაა,
// რომ ერთი ჯგუფის ქვეკატეგორიები ერთ სტილში იყოს.
import {
  Amphora, Backpack, BatteryFull, Blend, BookOpen, Brush, Cake, Calculator, Cpu, Dices, Droplet,
  Droplets, Eraser, FileText, FlaskConical, Flower2, FolderOpen, Frame, Gem, Gift, GraduationCap,
  Hammer, Heart, Highlighter, Image, KeyRound, Languages, Layers, Library, Mail, Moon, Notebook,
  NotebookPen, Package, PaintBucket, PaintRoller, Paintbrush, Palette, Paperclip, PartyPopper, Pen,
  Pencil, PencilLine, Pin, Pipette, Presentation, Puzzle, Ribbon, Ruler, Scissors, Scroll, Shapes,
  Shell, Shirt, ShoppingBag, Smile, Sparkles, StickyNote, Tag, ToyBrick, TreePine, Trophy,
  WandSparkles,
} from "lucide-react";

const BY_SLUG = {
  // სამხატვრო მასალები
  "nachris-saghebavebi": Shirt,
  "samkhatvro-markerebi-da-lainerebi": Highlighter,
  "palitrebi-da-palitris-danebi": Palette,
  "samkhatvro-qaghaldi": Scroll,
  "pastelebi": Blend,
  "samkhatvro-fanqrebi-da-nakhshiri": Pencil,
  "laqebi-gruntebi-da-mediumebi": FlaskConical,
  "guashis-saghebavebi": PaintBucket,
  "molbertebi": Presentation,
  "pigmentebi": Droplets,
  "funjebi": Brush,
  "tiloebi": Frame,
  "skechbuqebi": NotebookPen,
  "zetis-saghebavebi": Paintbrush,
  "akrilis-saghebavebi": PaintRoller,
  "akvarelis-saghebavebi": Droplet,
  // ძერწვა და მოდელირება
  "plastelinebi": Shapes,
  "tikhebi": Amphora,
  "samushao-iaraghebi": Hammer,
  // სასკოლო ნივთები
  "tsartsebi": Presentation,
  "saskolo-damkhmare-masalebi": GraduationCap,
  "feradi-fanqrebi-da-flomasterebi": PencilLine,
  "sakhazavebi-da-geometriuli-instrumentebi": Ruler,
  "sashlelebi-da-satlelebi": Eraser,
  "rveulebi": BookOpen,
  "penalebi": Backpack,
  // საკანცელარიო და საოფისე
  "foto-qaghaldebi": Image,
  "chikartebi": Pin,
  "tseboebi": Pipette,
  "steplerebi-da-stepleris-tyviebi": Paperclip,
  "dafebi-da-aqsesuarebi": Presentation,
  "makratlebi-da-sakantselario-instrumentebi": Scissors,
  "qaghaldi-da-muyao": Layers,
  "failebi-bainderebi-da-saqaghaldeebi": FolderOpen,
  "kalkulatorebi": Calculator,
  "stikerebi-da-chasanishni-furtslebi": StickyNote,
  "kalmebi": Pen,
  "bloknotebi-da-dghiurebi": Notebook,
  // სათამაშოები და საბავშვო შემოქმედება
  "biserebit-khatva": Gem,
  "saganmanatleblo-satamashoebi": Puzzle,
  "shemoqmedebiti-nakrebebi": Sparkles,
  "gasaferadeblebi": Palette,
  "sportuli-satamashoebi": Trophy,
  "squishebi-da-tylartsebi": Smile,
  "satamashoebi": ToyBrick,
  // ხელსაქმე და დეკორაცია
  "lentebi-da-tokebi": Ribbon,
  "shesafuti-masalebi": Package,
  "khelsaqmis-nakrebebi": WandSparkles,
  "dekoratiuli-masalebi": Flower2,
  "biserebi-da-mdzivebi": Shell,
  // საჩუქრები და სადღესასწაულო
  "bushtebi": PartyPopper,
  "dabadebis-dghis-aqsesuarebi": Cake,
  "sasachuqre-chantebi": ShoppingBag,
  "misalotsi-baratebi": Mail,
  "suvenirebi": Gift,
  "brelokebi": KeyRound,
  "sadghesastsaulo": PartyPopper,
  "saakhaltslo-nivtebi": TreePine,
  // წიგნები
  "skhva-sastsavlo-tsignebi": Library,
  "inglisuri-enis-sakhelmdzghvaneloebi": Languages,
  // ტარო და სამაგიდო თამაშები
  "taro-da-tematuri-aqsesuarebi": Moon,
  "samagido-tamashebi": Dices,
  // ელექტრონიკა
  "eleqtronika": Cpu,
  "elementi": BatteryFull,
  // სილამაზე
  "tmis-da-silamazis-aqsesuarebi": Heart,
};

// ახალი ქვეკატეგორიისთვის: სახელის სიტყვა → ხატულა
const BY_WORD = [
  ["საღებავ", PaintBucket], ["ფუნჯ", Brush], ["ფანქ", Pencil], ["კალამ", Pen], ["ქაღალდ", FileText],
  ["რვეულ", BookOpen], ["ბლოკნოტ", Notebook], ["წიგნ", Library], ["სათამაშ", ToyBrick],
  ["თამაშ", Dices], ["საჩუქ", Gift], ["წებო", Pipette], ["მაკრატ", Scissors], ["სტიკერ", StickyNote],
  ["მარკერ", Highlighter], ["ტილო", Frame], ["თიხ", Amphora], ["ბისერ", Gem], ["ელექტრ", Cpu],
];

// მთავარი კატეგორიის slug → ფონის გრადიენტი (Tailwind-ს სრული კლასები სჭირდება)
const TONES = {
  "samkhatvro-masalebi": "tw:from-violet-500 tw:to-fuchsia-500",
  "dzertsva-da-modelireba": "tw:from-orange-400 tw:to-amber-500",
  "saskolo-nivtebi": "tw:from-sky-500 tw:to-blue-600",
  "sakancelario-da-saofise": "tw:from-teal-500 tw:to-cyan-600",
  "satamashoebi-da-shemoqmedeba": "tw:from-lime-500 tw:to-emerald-600",
  "khelsaqme-da-dekoracia": "tw:from-rose-400 tw:to-pink-600",
  "sachuqrebi-da-sadghesastsavlo": "tw:from-red-500 tw:to-rose-600",
  "tsignebi-da-literatura": "tw:from-amber-500 tw:to-orange-600",
  "taro-da-samagido-tamashebi": "tw:from-indigo-500 tw:to-purple-600",
  "eleqtronika-da-khelsatsyoebi": "tw:from-cyan-500 tw:to-sky-600",
  "silamaze-da-aqsesuarebi": "tw:from-fuchsia-500 tw:to-pink-500",
};
const DEFAULT_TONE = "tw:from-slate-500 tw:to-slate-700";

const SIZES = {
  sm: "tw:size-8 tw:rounded-lg",
  md: "tw:size-10 tw:rounded-xl",
  lg: "tw:size-12 tw:rounded-2xl",
};
const ICON_PX = { sm: 16, md: 20, lg: 24 };

export function subcategoryIconFor(slug, name = "") {
  if (BY_SLUG[slug]) return BY_SLUG[slug];
  const text = String(name);
  return BY_WORD.find(([word]) => text.includes(word))?.[1] || Tag;
}

export default function SubcategoryIcon({ slug, name, mainSlug, size = "md", className = "" }) {
  const Icon = subcategoryIconFor(slug, name);
  return (
    // <i> და არა <span>: კატალოგის/ადმინის CSS-ში `span`-ზე წესებია (overflow, ფერი)
    <i aria-hidden="true"
      className={`tw:not-italic tw:inline-grid tw:shrink-0 tw:place-items-center tw:bg-linear-to-br tw:text-white tw:shadow-md tw:shadow-black/25 tw:ring-1 tw:ring-white/20 ${SIZES[size] || SIZES.md} ${TONES[mainSlug] || DEFAULT_TONE} ${className}`}>
      <Icon size={ICON_PX[size] || ICON_PX.md} strokeWidth={2} />
    </i>
  );
}
