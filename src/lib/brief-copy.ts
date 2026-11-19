import type { Locale } from "./i18n";

/** Every sentence the community brief and read-aloud script can say, per language. */
export interface BriefCopy {
  heading: (area: string, day: string) => string;
  worstAir: (hour: string, pm25: number, timesLimit: number) => string;
  bestAir: (hour: string, pm25: number) => string;
  routineHeading: string;
  commuteMode: (mode: string) => string;
  pledgesHeading: string;
  changesHeading: string;
  alsoCutsSmog: string;
  sharedAdoption: (title: string) => string;
  disclaimer: string;
  /** Read-aloud sentences. */
  speech: {
    intro: (micrograms: string) => string;
    extremes: (worstHour: string, bestHour: string) => string;
    routineStep: (hour: string, title: string) => string;
    change: (position: number, title: string, savedPercent: number) => string;
  };
}

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

/** English copy. `timesLimit` of 0 means "do not mention the limit". */
const EN: BriefCopy = {
  heading: (area, day) => `Air today in ${area} (${day})`,
  worstAir: (hour, pm25, timesLimit) =>
    `Worst around ${hour}: PM2.5 ${pm25} µg/m³` + (timesLimit > 0 ? `, about ${timesLimit}× India's daily limit.` : "."),
  bestAir: (hour, pm25) => `Cleanest around ${hour}: PM2.5 ${pm25} µg/m³. Air out homes and walk then if you can.`,
  routineHeading: "Today's routine:",
  commuteMode: (mode) => `Chosen commute mode: ${mode}`,
  pledgesHeading: "Community clean-air pledges:",
  changesHeading: "What helped most in one household's plan:",
  alsoCutsSmog: " (also cuts smog we make)",
  sharedAdoption: (title) => `If several homes do "${title.toLowerCase()}", the whole street breathes less.`,
  disclaimer: "Estimates from forecast PM2.5 and typical breathing rates. Not medical advice.",
  speech: {
    intro: (micrograms) => `Today your household will breathe about ${micrograms} micrograms of fine particles.`,
    extremes: (worstHour, bestHour) => `Outdoor air is worst around ${worstHour} and cleanest around ${bestHour}.`,
    routineStep: (hour, title) => `At ${hour}, ${lowerFirst(title)}.`,
    change: (position, title, savedPercent) => `Change ${position}: ${title}. It cuts your dose by ${savedPercent} percent.`,
  },
};

/** Hindi copy, same shape and same rule for `timesLimit`. */
const HI: BriefCopy = {
  heading: (area, day) => `${area} में आज की हवा (${day})`,
  worstAir: (hour, pm25, timesLimit) =>
    `सबसे खराब हवा ${hour} के आसपास: PM2.5 ${pm25} µg/m³` + (timesLimit > 0 ? `, जो मानक से ${timesLimit} गुना अधिक है।` : "।"),
  bestAir: (hour, pm25) => `सबसे साफ हवा ${hour} के आसपास: PM2.5 ${pm25} µg/m³। इसी समय घर में ताजी हवा लें।`,
  routineHeading: "आज की दिनचर्या:",
  commuteMode: (mode) => `चुनी गई यात्रा: ${mode}`,
  pledgesHeading: "लिए गए स्वच्छ हवा संकल्प:",
  changesHeading: "सबसे प्रभावी सुरक्षा उपाय:",
  alsoCutsSmog: " (प्रदूषण भी घटाता है)",
  sharedAdoption: (title) => `यदि कई परिवार "${title.toLowerCase()}" अपनाते हैं, तो पूरी सड़क स्वच्छ हवा ले सकेगी।`,
  disclaimer: "पूर्वानुमानित PM2.5 पर आधारित आकलन। चिकित्सीय सलाह नहीं।",
  speech: {
    intro: (micrograms) => `आज आपका परिवार लगभग ${micrograms} माइक्रोग्राम प्रदूषक कण सांस में लेगा।`,
    extremes: (worstHour, bestHour) => `बाहरी हवा ${worstHour} के आसपास सबसे खराब और ${bestHour} के आसपास सबसे साफ रहेगी।`,
    routineStep: (hour, title) => `${hour}: ${title}।`,
    change: (position, title, savedPercent) => `उपाय ${position}: ${title}। इससे आपके सांस का धुआँ ${savedPercent} प्रतिशत कम होगा।`,
  },
};

/** The copy table for a language; English when none is given. */
export function briefCopyFor(locale: Locale | undefined): BriefCopy {
  return locale === "hi" ? HI : EN;
}
