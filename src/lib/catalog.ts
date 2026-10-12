// The catalog of areas a couple might share, with starter tasks.
// During onboarding a household picks the areas that apply and decides who owns
// each one. Everything created from here is ordinary data afterwards: rename it,
// change it or delete it freely.
//
// Rules are RFC 5545 RRULE bodies (see lib/recurrence.ts). A weekly rule without
// a BYDAY repeats on the weekday of the first due date, which people choose
// during onboarding.

import type { RecurrenceMode } from "./recurrence";

export type SuggestedOwner = "me" | "partner";

export interface StarterTask {
  title: string;
  rule?: string;
  mode?: RecurrenceMode;
  /** First due date = this many days from today (or the rule's next date on/after that day). */
  startInDays?: number;
  remindDaysBefore?: number;
  notes?: string;
  /** Who it's assigned to. Defaults to the area owner. */
  assign?: "owner" | "other";
  /** Pre-ticked in onboarding? Defaults to true. */
  defaultOn?: boolean;
}

export interface BundleTask {
  title: string;
  /** Days relative to the date the person enters (negative = before). */
  offsetDays: number;
  /** Put this task in another area (by catalog key) when the household has it. */
  areaKey?: string;
}

/** A one-tap checklist, e.g. "New order" or "Plan a trip". */
export interface TaskBundle {
  key: string;
  label: string;
  nameLabel: string;
  namePlaceholder: string;
  dateLabel: string;
  tasks: BundleTask[];
}

export interface AreaTemplate {
  key: string;
  name: string;
  icon: string;
  category: CategoryKey;
  minimumStandard: string;
  keywords: string[];
  /** Pre-selected during onboarding. */
  suggested?: boolean;
  suggestedOwner?: SuggestedOwner;
  starterTasks: StarterTask[];
  bundles?: TaskBundle[];
}

export const CATEGORIES = [
  { key: "home", label: "Home" },
  { key: "food", label: "Food" },
  { key: "money", label: "Money & admin" },
  { key: "car", label: "Getting around" },
  { key: "pets", label: "Pets" },
  { key: "health", label: "Health" },
  { key: "people", label: "Friends & family" },
  { key: "fun", label: "Travel & fun" },
  { key: "us", label: "Us" },
  { key: "business", label: "Business" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const AREA_CATALOG: AreaTemplate[] = [
  // ---------------------------------------------------------------- Home
  {
    key: "house",
    name: "House",
    icon: "🏠",
    category: "home",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "Things that break get fixed or scheduled within a week. Seasonal maintenance happens on time. We know who to call for repairs.",
    keywords: ["repair", "fix", "plumber", "electrician", "hvac", "filter", "furnace", "ac", "gutters", "smoke detector", "water heater", "handyman", "leak"],
    starterTasks: [
      { title: "Replace HVAC air filter", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "after_completion", startInDays: 14 },
      { title: "Test smoke & CO detectors", rule: "FREQ=MONTHLY;INTERVAL=6", mode: "fixed", startInDays: 30 },
      { title: "Clean gutters", rule: "FREQ=YEARLY;BYMONTH=4,11;BYMONTHDAY=1", mode: "fixed" },
      { title: "Check under sinks & around toilets for leaks", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "fixed", startInDays: 21 },
      { title: "Clean dryer vent", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 60 },
      { title: "Flush water heater", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 90, defaultOn: false },
      { title: "Service furnace / AC", rule: "FREQ=YEARLY;BYMONTH=3,9;BYMONTHDAY=15", mode: "fixed", defaultOn: false },
    ],
  },
  {
    key: "cleaning",
    name: "Cleaning",
    icon: "🧽",
    category: "home",
    minimumStandard:
      "Kitchen counters and sink clear every night. Bathrooms cleaned weekly. Floors vacuumed weekly. Guests could drop by without panic.",
    keywords: ["clean", "vacuum", "mop", "dust", "bathroom", "scrub", "tidy"],
    starterTasks: [
      { title: "Clean bathrooms", rule: "FREQ=WEEKLY", mode: "fixed", startInDays: 5 },
      { title: "Vacuum & mop floors", rule: "FREQ=WEEKLY", mode: "fixed", startInDays: 5 },
      { title: "Change bed sheets", rule: "FREQ=WEEKLY;INTERVAL=2", mode: "fixed", startInDays: 6 },
      { title: "Deep clean kitchen (fridge, oven, microwave)", rule: "FREQ=MONTHLY", mode: "fixed", startInDays: 14 },
    ],
  },
  {
    key: "laundry",
    name: "Laundry",
    icon: "🧺",
    category: "home",
    minimumStandard: "Nobody runs out of clean clothes or towels. Clean laundry is folded and put away within a day.",
    keywords: ["laundry", "wash", "dry cleaning", "towels", "fold"],
    starterTasks: [
      { title: "Laundry", rule: "FREQ=WEEKLY", mode: "fixed", startInDays: 6 },
      { title: "Wash towels", rule: "FREQ=WEEKLY", mode: "fixed", startInDays: 3 },
    ],
  },
  {
    key: "dishes",
    name: "Dishes & Kitchen",
    icon: "🍽️",
    category: "home",
    minimumStandard: "Sink is empty before bed. Dishwasher is run when full and unloaded the next morning.",
    keywords: ["dishes", "dishwasher", "kitchen"],
    starterTasks: [],
  },
  {
    key: "trash",
    name: "Trash & Recycling",
    icon: "🗑️",
    category: "home",
    minimumStandard: "Bins go out the night before pickup and come back in the same day. Kitchen trash never overflows.",
    keywords: ["trash", "garbage", "recycling", "bins", "compost"],
    starterTasks: [{ title: "Take bins out for pickup", rule: "FREQ=WEEKLY", mode: "fixed", startInDays: 1 }],
  },
  {
    key: "yard",
    name: "Yard & Plants",
    icon: "🌿",
    category: "home",
    minimumStandard: "Lawn is mowed in season. Plants are watered. The outside of the house looks cared for.",
    keywords: ["mow", "lawn", "yard", "garden", "plants", "water plants", "weeds", "leaves", "sprinkler"],
    starterTasks: [
      { title: "Water house plants", rule: "FREQ=WEEKLY", mode: "fixed", startInDays: 2 },
      { title: "Mow the lawn", rule: "FREQ=WEEKLY", mode: "fixed", startInDays: 5, defaultOn: false },
      { title: "Fertilize lawn", rule: "FREQ=YEARLY;BYMONTH=4,9;BYMONTHDAY=15", mode: "fixed", defaultOn: false },
    ],
  },
  {
    key: "supplies",
    name: "Household Supplies",
    icon: "🧻",
    category: "home",
    minimumStandard: "We never run out of toilet paper, soap, paper towels, detergent or light bulbs.",
    keywords: ["toilet paper", "paper towels", "detergent", "soap", "light bulb", "batteries", "costco", "target", "amazon"],
    starterTasks: [{ title: "Check & restock household supplies", rule: "FREQ=WEEKLY;INTERVAL=2", mode: "fixed", startInDays: 7 }],
  },
  {
    key: "projects",
    name: "Home Projects & Decor",
    icon: "🛋️",
    category: "home",
    minimumStandard: "We keep one shared list of home projects, and one project is moving forward at a time.",
    keywords: ["paint", "decor", "furniture", "project", "hang", "shelf", "remodel"],
    starterTasks: [{ title: "Pick the next home project together", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "fixed", startInDays: 30 }],
  },
  {
    key: "mail",
    name: "Mail & Paperwork",
    icon: "📬",
    category: "home",
    minimumStandard: "Mail is opened within a few days. Anything needing action becomes a task. Important papers are filed.",
    keywords: ["mail", "paperwork", "file", "letter", "forms", "sign", "notary"],
    starterTasks: [{ title: "Sort mail & file paperwork", rule: "FREQ=WEEKLY", mode: "fixed", startInDays: 6 }],
  },
  {
    key: "declutter",
    name: "Declutter & Donations",
    icon: "📦",
    category: "home",
    minimumStandard: "Things we don't use leave the house. Donation runs happen before the pile takes over the closet.",
    keywords: ["donate", "declutter", "goodwill", "sell", "returns", "return"],
    starterTasks: [{ title: "Declutter one space & drop off donations", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "fixed", startInDays: 30 }],
  },

  // ---------------------------------------------------------------- Food
  {
    key: "groceries",
    name: "Groceries",
    icon: "🛒",
    category: "food",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "Fridge stocked for the week. Shared list kept current. Weekly shop done by Sunday. We never run out of coffee.",
    keywords: ["grocery", "groceries", "milk", "eggs", "coffee", "produce", "store", "heb", "whole foods", "trader joe's", "kroger", "aldi", "food"],
    starterTasks: [
      { title: "Weekly grocery shop", rule: "FREQ=WEEKLY;BYDAY=SA", mode: "fixed" },
      { title: "Check fridge & pantry, update the list", rule: "FREQ=WEEKLY;BYDAY=FR", mode: "fixed" },
      { title: "Clean out the fridge", rule: "FREQ=WEEKLY;INTERVAL=2", mode: "fixed", startInDays: 4, defaultOn: false },
    ],
  },
  {
    key: "meals",
    name: "Meal Planning & Cooking",
    icon: "🍳",
    category: "food",
    minimumStandard: "We know what's for dinner most nights this week, and the ingredients are in the house.",
    keywords: ["meal", "dinner", "cook", "recipe", "meal prep", "lunch"],
    starterTasks: [{ title: "Plan this week's dinners", rule: "FREQ=WEEKLY;BYDAY=SU", mode: "fixed" }],
  },
  {
    key: "hosting",
    name: "Hosting & Entertaining",
    icon: "🥂",
    category: "food",
    minimumStandard: "When we host, invites, food, drinks and a tidy house are handled without last-minute scrambling.",
    keywords: ["host", "party", "guests", "dinner party", "bbq"],
    starterTasks: [],
  },

  // ---------------------------------------------------------------- Money & admin
  {
    key: "finances",
    name: "Finances",
    icon: "💳",
    category: "money",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "Every bill is paid on time, with no late fees. We look at spending once a month and know roughly where we stand.",
    keywords: ["bill", "pay", "credit card", "bank", "budget", "rent", "mortgage", "utility", "electric", "water bill", "internet", "venmo", "transfer"],
    starterTasks: [
      { title: "Pay credit card", rule: "FREQ=MONTHLY;BYMONTHDAY=20", mode: "fixed", remindDaysBefore: 2 },
      { title: "Review last month's spending", rule: "FREQ=MONTHLY;BYMONTHDAY=3", mode: "fixed" },
      { title: "Check credit reports", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 45, defaultOn: false },
    ],
  },
  {
    key: "taxes",
    name: "Personal Taxes",
    icon: "🧾",
    category: "money",
    minimumStandard: "Documents are gathered by mid-February and taxes are filed before April 15. No surprises.",
    keywords: ["tax", "taxes", "w2", "1099", "irs", "cpa", "turbotax"],
    starterTasks: [
      { title: "Gather tax documents", rule: "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=15", mode: "fixed", remindDaysBefore: 7 },
      { title: "File personal taxes", rule: "FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=1", mode: "fixed", remindDaysBefore: 14 },
    ],
  },
  {
    key: "savings",
    name: "Savings & Investments",
    icon: "📈",
    category: "money",
    minimumStandard: "Automatic savings are running. We review retirement and savings goals each quarter.",
    keywords: ["401k", "ira", "invest", "savings", "retirement", "brokerage"],
    starterTasks: [{ title: "Review savings & investments", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "fixed", startInDays: 30 }],
  },
  {
    key: "insurance",
    name: "Insurance",
    icon: "🛡️",
    category: "money",
    minimumStandard: "Home, auto, health and life policies are current, and we shop rates once a year.",
    keywords: ["insurance", "policy", "premium", "claim", "deductible"],
    starterTasks: [{ title: "Review insurance policies & rates", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 60 }],
  },
  {
    key: "subscriptions",
    name: "Subscriptions & Accounts",
    icon: "🔁",
    category: "money",
    minimumStandard: "We only pay for subscriptions we use. Passwords and shared accounts are in the password manager.",
    keywords: ["subscription", "netflix", "spotify", "cancel", "password", "account", "login"],
    starterTasks: [{ title: "Review subscriptions & cancel unused ones", rule: "FREQ=MONTHLY;INTERVAL=6", mode: "fixed", startInDays: 30 }],
  },
  {
    key: "documents",
    name: "Important Documents",
    icon: "📁",
    category: "money",
    minimumStandard: "Passports, IDs, wills and beneficiaries are current, and we both know where they're kept.",
    keywords: ["passport", "license", "wills", "estate", "beneficiary", "birth certificate", "social security", "dmv", "id"],
    starterTasks: [
      { title: "Check passport & license expiration dates", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 30 },
      { title: "Review will & beneficiaries", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 120, defaultOn: false },
    ],
  },
  {
    key: "tech",
    name: "Tech & Devices",
    icon: "💻",
    category: "money",
    minimumStandard: "Phones and computers are backed up. Wi-Fi works. Shared devices are updated.",
    keywords: ["wifi", "router", "backup", "phone", "computer", "laptop", "printer", "tv", "software update"],
    starterTasks: [{ title: "Check phone & computer backups", rule: "FREQ=MONTHLY", mode: "fixed", startInDays: 14, defaultOn: false }],
  },

  // ---------------------------------------------------------------- Getting around
  {
    key: "car",
    name: "Car",
    icon: "🚗",
    category: "car",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "Cars are safe, inspected, registered and insured. Maintenance happens on schedule, not after something breaks.",
    keywords: ["car", "oil change", "registration", "tires", "inspection", "car wash", "mechanic", "gas", "toll", "tag"],
    starterTasks: [
      {
        title: "Oil change",
        rule: "FREQ=MONTHLY;INTERVAL=6",
        mode: "after_completion",
        startInDays: 30,
        notes: "Every 6 months or 5,000 miles, whichever comes first.",
      },
      { title: "Renew car registration", rule: "FREQ=YEARLY", mode: "fixed", startInDays: 60, remindDaysBefore: 14, notes: "Set this to your actual renewal date." },
      { title: "Check tire pressure", rule: "FREQ=MONTHLY", mode: "fixed", startInDays: 7 },
      { title: "Rotate tires", rule: "FREQ=MONTHLY;INTERVAL=6", mode: "after_completion", startInDays: 45, defaultOn: false },
      { title: "Renew car insurance", rule: "FREQ=YEARLY", mode: "fixed", startInDays: 90, remindDaysBefore: 21, defaultOn: false },
    ],
  },

  // ---------------------------------------------------------------- Pets
  {
    key: "dog",
    name: "Dog",
    icon: "🐕",
    category: "pets",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "The dog is fed, walked, and on time with meds and vet visits. We never run out of food. Care is arranged before every trip.",
    keywords: ["dog", "vet", "heartworm", "flea", "tick", "groomer", "grooming", "kibble", "dog food", "walk the dog", "dog sitter", "boarding", "puppy"],
    starterTasks: [
      { title: "Heartworm pill", rule: "FREQ=MONTHLY;BYMONTHDAY=1", mode: "fixed" },
      { title: "Flea & tick treatment", rule: "FREQ=MONTHLY;BYMONTHDAY=1", mode: "fixed" },
      { title: "Order dog food", rule: "FREQ=WEEKLY;INTERVAL=4", mode: "after_completion", startInDays: 14 },
      { title: "Annual vet checkup & vaccines", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 60, remindDaysBefore: 14 },
      { title: "Bath / grooming", rule: "FREQ=WEEKLY;INTERVAL=6", mode: "after_completion", startInDays: 21 },
    ],
  },

  // ---------------------------------------------------------------- Health
  {
    key: "health",
    name: "Health Appointments",
    icon: "🩺",
    category: "health",
    minimumStandard: "Physicals, dentist and eye appointments are booked on time. Prescriptions never run out.",
    keywords: ["doctor", "dentist", "dental", "physical", "eye exam", "prescription", "pharmacy", "refill", "appointment", "therapist"],
    starterTasks: [
      { title: "Book dentist cleanings", rule: "FREQ=MONTHLY;INTERVAL=6", mode: "after_completion", startInDays: 30 },
      { title: "Book annual physicals", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 45 },
      { title: "Book eye exams", rule: "FREQ=YEARLY", mode: "after_completion", startInDays: 90, defaultOn: false },
    ],
  },

  // ---------------------------------------------------------------- Friends & family
  {
    key: "social",
    name: "Social Calendar",
    icon: "📅",
    category: "people",
    suggested: true,
    suggestedOwner: "partner",
    minimumStandard:
      "We know what's coming up in the next month. Invitations get an answer within a few days. We see friends regularly.",
    keywords: ["rsvp", "party", "wedding", "invite", "dinner with", "plans", "friends", "get together", "concert", "tickets"],
    starterTasks: [
      { title: "Look over the next month's plans together", rule: "FREQ=MONTHLY;BYMONTHDAY=1", mode: "fixed" },
      { title: "Plan a get-together with friends", rule: "FREQ=MONTHLY", mode: "after_completion", startInDays: 14 },
    ],
  },
  {
    key: "gifts",
    name: "Birthdays & Gifts",
    icon: "🎁",
    category: "people",
    suggested: true,
    suggestedOwner: "partner",
    minimumStandard: "Cards and gifts arrive on time for birthdays, anniversaries and holidays. No last-minute gas station gifts.",
    keywords: ["birthday", "gift", "present", "card", "anniversary", "thank you note"],
    starterTasks: [
      { title: "Update the birthdays & anniversaries list", rule: "FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=5", mode: "fixed" },
      { title: "Plan holiday gifts", rule: "FREQ=YEARLY;BYMONTH=11;BYMONTHDAY=1", mode: "fixed" },
    ],
  },
  {
    key: "holidays",
    name: "Holidays",
    icon: "🎄",
    category: "people",
    minimumStandard: "Holiday plans are decided early, and travel, hosting and decorations are handled.",
    keywords: ["thanksgiving", "christmas", "holiday", "easter", "decorations"],
    starterTasks: [{ title: "Decide holiday plans with family", rule: "FREQ=YEARLY;BYMONTH=9;BYMONTHDAY=15", mode: "fixed" }],
  },
  {
    key: "family",
    name: "Family",
    icon: "👪",
    category: "people",
    minimumStandard: "We stay in touch with both families, and visits are planned instead of forgotten.",
    keywords: ["mom", "dad", "parents", "family", "sister", "brother", "grandma", "in-laws"],
    starterTasks: [{ title: "Call or visit family", rule: "FREQ=WEEKLY;INTERVAL=2", mode: "after_completion", startInDays: 7, defaultOn: false }],
  },

  // ---------------------------------------------------------------- Travel & fun
  {
    key: "travel",
    name: "Travel",
    icon: "✈️",
    category: "fun",
    suggested: true,
    suggestedOwner: "partner",
    minimumStandard:
      "Trips are booked early enough to be affordable. The dog, the house and the mail are handled before we leave. Packing lists live here.",
    keywords: ["trip", "flight", "flights", "hotel", "airbnb", "vacation", "packing", "pack", "passport", "rental car"],
    starterTasks: [{ title: "Pick our next trip", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "fixed", startInDays: 21 }],
    bundles: [
      {
        key: "trip",
        label: "Plan a trip",
        nameLabel: "Where to?",
        namePlaceholder: "Hawaii",
        dateLabel: "Leaving on",
        tasks: [
          { title: "Book flights & lodging", offsetDays: -60 },
          { title: "Book dog sitter or boarding", offsetDays: -21, areaKey: "dog" },
          { title: "Request time off & set out-of-office", offsetDays: -14 },
          { title: "Hold mail & set thermostat plan", offsetDays: -3, areaKey: "house" },
          { title: "Pack", offsetDays: -1 },
        ],
      },
    ],
  },
  {
    key: "dates",
    name: "Date Nights",
    icon: "🕯️",
    category: "us",
    minimumStandard: "We have a real date at least every two weeks, planned by one of us, not just a night of Netflix.",
    keywords: ["date night", "date", "reservation", "restaurant"],
    starterTasks: [{ title: "Plan a date night", rule: "FREQ=WEEKLY;INTERVAL=2", mode: "after_completion", startInDays: 5 }],
  },
  {
    key: "weekends",
    name: "Weekends & Experiences",
    icon: "🎟️",
    category: "fun",
    minimumStandard: "We have something to look forward to most months, like a show, a hike or a day trip.",
    keywords: ["weekend", "tickets", "show", "hike", "day trip", "museum", "game"],
    starterTasks: [],
  },
  {
    key: "planning",
    name: "Weekly Planning",
    icon: "🗓️",
    category: "us",
    minimumStandard: "We sit down once a week, look at the next two weeks together, and rebalance anything that's off.",
    keywords: ["weekly review", "planning session"],
    starterTasks: [{ title: "Weekly planning session", rule: "FREQ=WEEKLY;BYDAY=SU", mode: "fixed" }],
  },

  // ---------------------------------------------------------------- Business
  {
    key: "biz-sales",
    name: "Sales & Marketing",
    icon: "📣",
    category: "business",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "Every inquiry gets a reply within one business day. There's a plan for this month's marketing. Leads are followed up, not forgotten.",
    keywords: ["lead", "leads", "inquiry", "marketing", "ad", "ads", "newsletter", "email list", "website", "pricing", "quote", "showroom"],
    starterTasks: [
      { title: "Follow up on open leads & inquiries", rule: "FREQ=WEEKLY;BYDAY=MO", mode: "fixed" },
      { title: "Plan this month's marketing push", rule: "FREQ=MONTHLY;BYMONTHDAY=1", mode: "fixed" },
      { title: "Ask recent customers for photos & reviews", rule: "FREQ=MONTHLY;BYMONTHDAY=15", mode: "fixed" },
    ],
  },
  {
    key: "biz-orders",
    name: "Orders, Shipping & Customers",
    icon: "📦",
    category: "business",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "Every order has a ship-by date and the customer knows it. Orders ship on time with tracking sent. Customer messages get answered within a day.",
    keywords: ["new order", "ship", "shipping", "freight", "tracking", "customer", "delivery", "crate", "packaging", "ups", "fedex"],
    starterTasks: [{ title: "Check for new orders & customer messages", rule: "FREQ=WEEKLY;BYDAY=MO,TH", mode: "fixed" }],
    bundles: [
      {
        key: "order",
        label: "New order",
        nameLabel: "Customer or order",
        namePlaceholder: "Smith chair",
        dateLabel: "Ship by",
        tasks: [
          { title: "Confirm order details & send timeline to customer", offsetDays: -28 },
          { title: "Schedule the build with our builder", offsetDays: -27, areaKey: "biz-builder" },
          { title: "Order cushion fabric & foam", offsetDays: -26, areaKey: "biz-materials" },
          { title: "Sew cushions", offsetDays: -7, areaKey: "biz-cushions" },
          { title: "Pick up the finished chair & inspect it", offsetDays: -5, areaKey: "biz-builder" },
          { title: "Book shipping / freight", offsetDays: -5 },
          { title: "Pack & ship, send tracking to customer", offsetDays: 0 },
          { title: "Follow up with customer after delivery", offsetDays: 10, areaKey: "biz-sales" },
        ],
      },
    ],
  },
  {
    key: "biz-builder",
    name: "Builder & Production",
    icon: "🪚",
    category: "business",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "The builder always knows what's next and when it's due. We check in weekly on every build in progress. Quality issues are raised right away.",
    keywords: ["builder", "build", "frame", "wood", "production", "workshop"],
    starterTasks: [{ title: "Check in with builder on current builds", rule: "FREQ=WEEKLY;BYDAY=WE", mode: "fixed" }],
  },
  {
    key: "biz-cushions",
    name: "Cushion Sewing",
    icon: "🧵",
    category: "business",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "Cushions are cut, sewn and assembled before the piece is ready to ship. Assembly is a tag-team; whoever owns this does most of the sewing.",
    keywords: ["sew", "sewing", "upholstery", "stitch", "cut fabric"],
    starterTasks: [{ title: "Sewing station: thread, needles & machine maintenance", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "fixed", startInDays: 30, defaultOn: false }],
  },
  {
    key: "biz-materials",
    name: "Cushion Materials",
    icon: "🪡",
    category: "business",
    suggested: true,
    suggestedOwner: "partner",
    minimumStandard:
      "Fabric, foam and notions are always on hand for the next two orders. Reorders go in before we run low, not after.",
    keywords: ["cushion fabric", "fabric", "foam", "batting", "zipper", "materials", "supplies", "swatch"],
    starterTasks: [{ title: "Check fabric & foam inventory", rule: "FREQ=MONTHLY;BYMONTHDAY=1", mode: "fixed" }],
  },
  {
    key: "biz-social",
    name: "Social Media",
    icon: "📸",
    category: "business",
    suggested: true,
    suggestedOwner: "partner",
    minimumStandard: "We post consistently, a couple of times a week, and comments and DMs get a reply.",
    keywords: ["instagram", "post", "posts", "social media", "tiktok", "pinterest", "reel", "photo shoot", "content"],
    starterTasks: [
      { title: "Post on social media", rule: "FREQ=WEEKLY;BYDAY=TU,FR", mode: "fixed" },
      { title: "Plan next month's posts", rule: "FREQ=MONTHLY;BYMONTHDAY=25", mode: "fixed" },
    ],
  },
  {
    key: "biz-design",
    name: "Product Design",
    icon: "✏️",
    category: "business",
    suggested: true,
    suggestedOwner: "partner",
    minimumStandard: "Design decisions, specs and drawings for the builder are current. New ideas get captured and reviewed each quarter.",
    keywords: ["design", "sketch", "prototype", "spec", "drawing", "finish", "stain", "colorway"],
    starterTasks: [{ title: "Quarterly product & design review", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "fixed", startInDays: 30 }],
  },
  {
    key: "biz-books",
    name: "Business Books & Taxes",
    icon: "📒",
    category: "business",
    suggested: true,
    suggestedOwner: "me",
    minimumStandard:
      "Books are reconciled every month. Estimated taxes are paid on time. Receipts are saved. Business and personal money stay separate.",
    keywords: ["bookkeeping", "books", "quickbooks", "receipts", "invoice", "estimated tax", "sales tax", "llc", "reconcile", "expenses"],
    starterTasks: [
      { title: "Monthly bookkeeping: reconcile & categorize", rule: "FREQ=MONTHLY;BYMONTHDAY=5", mode: "fixed" },
      {
        title: "Pay quarterly estimated taxes",
        rule: "FREQ=YEARLY;BYMONTH=1,4,6,9;BYMONTHDAY=15",
        mode: "fixed",
        remindDaysBefore: 14,
        notes: "Federal estimated tax due dates: Jan 15, Apr 15, Jun 15, Sep 15. Check your state's dates too.",
      },
      { title: "Year-end business tax prep", rule: "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=1", mode: "fixed", remindDaysBefore: 14 },
      { title: "File sales tax", rule: "FREQ=MONTHLY;INTERVAL=3", mode: "fixed", startInDays: 30, defaultOn: false, notes: "Adjust to your state's filing schedule." },
    ],
  },
];

export const CATALOG_BY_KEY = new Map(AREA_CATALOG.map((a) => [a.key, a]));

export function keywordsFor(templateKey: string | null | undefined): string[] {
  return (templateKey && CATALOG_BY_KEY.get(templateKey)?.keywords) || [];
}

export function bundlesFor(templateKey: string | null | undefined): TaskBundle[] {
  return (templateKey && CATALOG_BY_KEY.get(templateKey)?.bundles) || [];
}
