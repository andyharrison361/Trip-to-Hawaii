// Named colors for kids' profiles. Stored by name in the database so the
// palette can be retuned without touching data. Full class strings are listed
// literally so Tailwind picks them up.

export const KID_COLORS = {
  rose: { label: "Rose", dot: "bg-[#d9738a]", soft: "bg-[#f8e1e6] text-[#8f3a4f] dark:bg-[#4a2a32] dark:text-[#f2b6c3]" },
  sky: { label: "Sky", dot: "bg-[#5b93c7]", soft: "bg-[#dfeaf6] text-[#2f5d88] dark:bg-[#24384c] dark:text-[#a9cbeb]" },
  sun: { label: "Sunflower", dot: "bg-[#e0a630]", soft: "bg-[#f8ecc9] text-[#83600f] dark:bg-[#463a1d] dark:text-[#f0d28a]" },
  grape: { label: "Grape", dot: "bg-[#8a6cc0]", soft: "bg-[#ebe4f6] text-[#55407e] dark:bg-[#352c48] dark:text-[#cbbbea]" },
  mint: { label: "Mint", dot: "bg-[#4fa88a]", soft: "bg-[#dcf0e8] text-[#2a6b55] dark:bg-[#21402f] dark:text-[#9fdcc4]" },
  tangerine: { label: "Tangerine", dot: "bg-[#e07b45]", soft: "bg-[#f9e3d6] text-[#8c4520] dark:bg-[#4a2f22] dark:text-[#f2b796]" },
} as const;

export type KidColor = keyof typeof KID_COLORS;

export const KID_COLOR_NAMES = Object.keys(KID_COLORS) as KidColor[];

export function kidColor(name: string | null | undefined) {
  return KID_COLORS[(name as KidColor) in KID_COLORS ? (name as KidColor) : "sky"];
}

/** The next unused color, so each new kid gets a distinct one. */
export function nextKidColor(used: string[]): KidColor {
  return KID_COLOR_NAMES.find((c) => !used.includes(c)) ?? KID_COLOR_NAMES[used.length % KID_COLOR_NAMES.length];
}
