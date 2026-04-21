export interface Pal {
  id: string;
  name: string;
  region: string;
  city: string;
  hue: number;
  interests: string[];
  replyStyle: "quick" | "thoughtful" | "deep";
  compatibility: number;
  isNew: boolean;
  lastActive: string;
  bio: string;
}

const SAMPLE_PALS: Pal[] = [
  { id: "1", name: "Mira K.", region: "Europe", city: "Ljubljana", hue: 210, interests: ["Philosophy", "Literature", "Tea"], replyStyle: "thoughtful", compatibility: 94, isNew: false, lastActive: "2h ago", bio: "I collect unfinished notebooks and finished thoughts." },
  { id: "2", name: "T.J.", region: "East Asia", city: "Kyoto", hue: 145, interests: ["Photography", "Architecture", "Film"], replyStyle: "deep", compatibility: 88, isNew: true, lastActive: "5h ago", bio: "Former architect. Now I photograph the spaces between things." },
  { id: "3", name: "Adaeze", region: "Africa", city: "Lagos", hue: 30, interests: ["Literature", "Music", "Politics"], replyStyle: "quick", compatibility: 81, isNew: false, lastActive: "1d ago", bio: "Writes long letters on Sunday mornings. Shorter ones the rest of the week." },
  { id: "4", name: "S\u00F8ren", region: "Europe", city: "Copenhagen", hue: 260, interests: ["Philosophy", "Science", "Sustainability"], replyStyle: "thoughtful", compatibility: 79, isNew: false, lastActive: "3h ago", bio: "Asks difficult questions. Comfortable with the silence after." },
  { id: "5", name: "Lena B.", region: "Americas", city: "Montreal", hue: 340, interests: ["Poetry", "Art", "Languages"], replyStyle: "deep", compatibility: 76, isNew: true, lastActive: "6h ago", bio: "Translates feelings into French and back. Fluent in neither." },
  { id: "6", name: "Rafi", region: "Middle East", city: "Beirut", hue: 180, interests: ["History", "Food & Cooking", "Architecture"], replyStyle: "thoughtful", compatibility: 72, isNew: false, lastActive: "2d ago", bio: "Cooks from memory. Writes from the same place." },
];

export default SAMPLE_PALS;
