/** English translations for data text, pollutants, AQI, schedule warnings and routine rules. */
export const enData = {
  // AQI categories
  aqi_cat_good: "Good",
  aqi_cat_satisfactory: "Satisfactory",
  aqi_cat_moderate: "Moderate",
  aqi_cat_poor: "Poor",
  aqi_cat_very_poor: "Very poor",
  aqi_cat_severe: "Severe",

  // Criteria pollutants
  pollutant_name_pm25: "Fine particulate matter",
  pollutant_sources_pm25: "Vehicles, biomass and coal burning, industrial emissions, road dust.",
  pollutant_effects_pm25: "Deep lung penetration that enters the bloodstream, triggering respiratory and cardiovascular distress.",
  pollutant_at_risk_pm25: "Children, older adults, pregnant people, and those with heart or lung disease.",

  pollutant_name_pm10: "Coarse particulate matter",
  pollutant_sources_pm10: "Construction sites, unpaved roads, windblown soil, agricultural burning.",
  pollutant_effects_pm10: "Irritates upper airways, eyes, and throat, aggravating chronic bronchitis and asthma.",
  pollutant_at_risk_pm10: "Outdoor workers, children, and people with existing respiratory conditions.",

  pollutant_name_no2: "Nitrogen dioxide",
  pollutant_sources_no2: "Motor vehicles, diesel generators, thermal power plants, gas stoves.",
  pollutant_effects_no2: "Inflames the lining of the lungs, reduces immunity to lung infections, and sparks asthma attacks.",
  pollutant_at_risk_no2: "Commuters, children living near major roads, and people with asthma.",

  pollutant_name_o3: "Ground-level ozone",
  pollutant_sources_o3: "Formed in sunlight from vehicular emissions and volatile organic compounds (VOCs).",
  pollutant_effects_o3: "Strong oxidant that inflames airway tissues, causing chest tightness, coughing, and reduced lung capacity.",
  pollutant_at_risk_o3: "Children active outdoors in sunny afternoons, athletes, and asthmatics.",

  pollutant_name_co: "Carbon monoxide",
  pollutant_sources_co: "Incomplete fuel combustion in petrol engines, biomass cookstoves, and generators.",
  pollutant_effects_co: "Binds to blood haemoglobin in place of oxygen, causing dizziness, fatigue, and cardiac strain.",
  pollutant_at_risk_co: "People with ischaemic heart disease, fetuses, newborns, and traffic workers.",

  pollutant_name_so2: "Sulphur dioxide",
  pollutant_sources_so2: "Coal-fired power generation, oil refineries, and industrial smelters.",
  pollutant_effects_so2: "Causes rapid bronchial constriction, throat irritation, and worsens underlying respiratory illness.",
  pollutant_at_risk_so2: "Asthmatics exercising outdoors, elderly individuals, and industrial-adjacent communities.",

  // Schedule validation warnings
  sched_empty: "Add at least one block to this day.",
  sched_needs_length: "{desc} needs a length.",
  sched_too_long: "{desc} is longer than a whole day.",
  sched_day_over_24: "This day adds up to {total} hr, {extra} hr longer than 24 hours. Shorten a block.",
  sched_overlap: "{desc1} overlaps {desc2}. Move or shorten one.",
  sched_another_block: "another block",
  sched_at_clock: "{name} at {clock}",

  // Routine items
  routine_title_open_windows: "Open windows for 15 minutes",
  routine_detail_open_windows: "Cleanest daytime air today at {pm25} µg/m³.",
  routine_title_outdoor: "Best time to be outside",
  routine_detail_outdoor: "Least smoggy daytime hours for {names} to be outdoors, about {pm25} µg/m³.",
  routine_detail_outdoor_ozone_alt: "Next-best daytime hours for {names} to be outdoors, about {pm25} µg/m³; afternoon ozone is elevated at {o3} µg/m³.",
  routine_detail_outdoor_ozone_warn: "Least smoggy daytime hours for {names} to be outdoors, about {pm25} µg/m³, but afternoon ozone is elevated ({o3} µg/m³).",
  routine_title_keep_windows_shut: "Keep windows shut",
  routine_detail_keep_windows_shut_limit: "Outdoor PM2.5 averages {pm25} µg/m³, about {times}× India's daily limit.",
  routine_detail_keep_windows_shut: "Outdoor PM2.5 averages {pm25} µg/m³.",
  routine_title_commute_n95: "Wear an N95 mask outside",
  routine_title_commute_public: "Take public transport instead of cycling",
  routine_title_commute_mask_cycle: "Wear an N95 mask while cycling",
  routine_title_commute_mask_walk: "Wear an N95 mask while walking",
  routine_title_commute_recirculate: "Keep car windows up, air on recirculate",
  routine_detail_commute: "{name}'s commute: outdoor PM2.5 is about {pm25} µg/m³.",
  routine_detail_commute_you: "Your commute: outdoor PM2.5 is about {pm25} µg/m³.",
  routine_title_cook_chimney: "Run the chimney while cooking",
  routine_title_cook_door: "Cook with the kitchen door shut",
  routine_title_clean_fuel: "Switch to cleaner cooking fuel",
  routine_detail_cook: "Cooking adds indoor PM2.5; ambient outdoor air is {pm25} µg/m³.",
  routine_title_sleep_purifier: "Windows closed, purifier on in the bedroom",
  routine_title_sleep_shut: "Windows closed before bed",
  routine_detail_sleep: "Overnight outdoor PM2.5 is around {pm25} µg/m³.",

  // Loading and error banners
  loading_calculating_plan: "Calculating daily inhaled doses and ranking protective changes...",
  error_calculating_plan: "Failed to calculate exposure plan",
};
