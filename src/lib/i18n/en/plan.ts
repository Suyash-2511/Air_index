/** English translations for plan dashboard components, visualizers and action bars. */
export const enPlan = {
  // AirToday
  air_today_kicker: "Air Quality Index · Current conditions",
  air_today_cpcb_label: "CPCB NAQI",
  air_today_dominant_label: "Dominant pollutant:",
  air_today_source_label: "Source:",
  air_today_source_google: "CPCB via Google Air Quality",
  air_today_source_computed: "CPCB scale (computed from hourly readings)",
  air_today_region_aria: "Criteria pollutants breakdown",
  air_today_within_limit: "Within limit",
  air_today_ratio_limit: "{ratio}× limit",
  air_today_row_aria: "{label}: {val}, {limit}. Toggle health details.",
  no_reading: "No reading",
  ratio_times_limit: "{ratio} times national limit",
  within_limit: "within limit",
  pollutant_heading_standard: "Standard",
  pollutant_standard_text: "National limit: {limit} {unit} ({period} standard)",
  pollutant_heading_health: "Health effect",
  pollutant_heading_sources: "Common sources",
  pollutant_heading_at_risk: "At-risk groups",
  air_today_disclaimer: "Your dose below is based on PM2.5, the pollutant with the strongest evidence for breathing harm.",

  // InversionExplainer
  inversion_title: "Why is the air worst at night and early morning?",
  inversion_desc: "During winter, nighttime radiative cooling in north India creates a temperature inversion. Instead of air getting cooler with height, a warm lid forms above the cold ground, trapping smoke, dust, and vehicle emissions in a shallow surface layer until afternoon sunshine breaks it.",
  inversion_svg_aria: "Three-stage physical process: nocturnal cooling, thermal inversion lid trapping pollutants, and daytime solar dispersion",
  inversion_stage1_title: "1. Cold night",
  inversion_stage1_sub: "Radiative heat loss",
  inversion_stage2_title: "2. Trapped layer",
  inversion_stage2_lid: "Warm air lid (inversion)",
  inversion_stage2_smog: "Trapped surface smog",
  inversion_stage3_title: "3. Sun lifts it",
  inversion_stage3_sub: "Thermal mixing dilutes haze",
  inversion_step1_label: "Stage 1",
  inversion_step1_heading: "Night cooling",
  inversion_step1_text: "The earth sheds warmth into clear skies, chilling air near the soil faster than air aloft.",
  inversion_step2_label: "Stage 2",
  inversion_step2_heading: "Atmospheric lid",
  inversion_step2_text: "Lighter warm air caps the cold layer. Zero vertical buoyancy locks vehicle and biomass smoke near breathing height.",
  inversion_step3_label: "Stage 3",
  inversion_step3_heading: "Afternoon breakout",
  inversion_step3_text: "Solar insolation warms the ground by early afternoon, triggering convective mixing that deepens the boundary layer.",

  // RoutineTimeline
  timeline_heading: "Your routine for today",
  timeline_subtitle: "{area} · built from today's forecast",
  timeline_applies_to_aria: "Applies to",
  timeline_cuts_own_smog: "Also cuts smog you make",
  timeline_add_to_plan: "Add to plan",
  timeline_add_to_plan_aria: "Add {title} to plan",
  timeline_add_calendar: "Add to Google Calendar",
  timeline_add_calendar_aria: "Add {title} to Google Calendar",
  timeline_inversion_link: "Why winter mornings are worst →",
  timeline_ventilation_link: "Ventilation guide →",

  // ChangeCard
  effort_free: "Free",
  effort_low_cost: "Low cost",
  effort_investment: "Investment",
  change_savings: "−{pct}% · {ug} µg less",
  change_toggle_aria: "Toggle {title}",
  change_hide_details: "Hide details ↑",
  change_show_details: "How to do this ↓",
  change_clean_energy_note: "Clean energy note:",

  // AreaMap
  map_fallback: "The area map could not load right now.",
  map_alt: "Street map of {label} with PM2.5 heatmap overlay",
  map_caption: "{label} · PM2.5 heatmap, Google Air Quality",

  // DayStrip
  daystrip_title: "Your household, hour by hour",
  daystrip_today: "{total} µg today",
  daystrip_peak: "Peak intake at {clock} ({val} µg)",
  daystrip_table_caption: "Hourly inhaled PM2.5 dose breakdown for {name}",
  daystrip_th_hour: "Hour",
  daystrip_th_dose: "Inhaled Dose (µg)",

  // AskPanel
  ask_title: "Ask about your plan",
  ask_subtitle: "Ask specific questions about your family members, mask use, purifier settings, or commute adjustments.",
  ask_input_aria: "Ask a question about your plan",
  ask_placeholder_again: "Ask another question",
  ask_placeholder_default: "e.g. Should my mother wear a mask?",
  ask_btn_loading: "Checking your plan…",
  ask_btn: "Ask",
  ask_you_asked: "You asked: “{q}”",
  ask_cited_actions: "Cited actions:",
  ask_disclaimer_title: "Medical disclaimer:",
  ask_disclaimer_body: "Saans provides exposure estimates for planning and routine adaptation. It is not medical advice. For severe symptoms, acute respiratory distress, or medical emergencies, seek immediate clinical care.",

  // PlanActions
  read_aloud: "Read aloud",
  stop_reading: "Stop",
  copy_brief: "Copy community brief",
  share_btn: "Share",
  print_btn: "Print plan",
  brief_copied: "Brief copied",

  // IndoorAirSection
  indoor_heading: "Make the air inside cleaner",
  indoor_subtitle: "Indoor particulate levels depend on infiltration, room volume, and active filtration.",
};
