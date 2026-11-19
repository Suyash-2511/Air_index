/** Hindi translations for plan dashboard components, visualizers and action bars. */
export const hiPlan = {
  // AirToday
  air_today_kicker: "वायु गुणवत्ता सूचकांक · वर्तमान स्थिति",
  air_today_cpcb_label: "CPCB NAQI",
  air_today_dominant_label: "प्रमुख प्रदूषक:",
  air_today_source_label: "स्रोत:",
  air_today_source_google: "Google Air Quality के माध्यम से CPCB",
  air_today_source_computed: "CPCB पैमाना (प्रति घंटा आंकड़ों से निकाला गया)",
  air_today_region_aria: "छह प्रमुख प्रदूषकों का विवरण",
  air_today_within_limit: "मानक के भीतर",
  air_today_ratio_limit: "मानक से {ratio} गुना",
  air_today_row_aria: "{label}: {val}, {limit}। स्वास्थ्य विवरण देखने के लिए क्लिक करें।",
  no_reading: "कोई आंकड़ा नहीं",
  ratio_times_limit: "राष्ट्रीय मानक से {ratio} गुना",
  within_limit: "मानक के भीतर",
  pollutant_heading_standard: "मानक",
  pollutant_standard_text: "राष्ट्रीय मानक: {limit} {unit} ({period} मानक)",
  pollutant_heading_health: "स्वास्थ्य पर असर",
  pollutant_heading_sources: "मुख्य स्रोत",
  pollutant_heading_at_risk: "संवेदनशील समूह",
  air_today_disclaimer: "नीचे दी गई आपकी खुराक PM2.5 पर आधारित है, जो फेफड़ों को सबसे अधिक नुकसान पहुँचाने वाला प्रदूषक है।",

  // InversionExplainer
  inversion_title: "रात और सुबह के समय हवा सबसे खराब क्यों होती है?",
  inversion_desc: "सर्दियों में रात की ठंडक उत्तर भारत में तापमान का उलटाव (इनवर्जन) पैदा करती है। ऊँचाई पर हवा ठंडी होने के बजाय ज़मीन के ऊपर गर्म हवा की एक ढक्कन जैसी परत बन जाती है, जो धुएं, धूल और गाड़ियों के धुएं को तब तक रोक कर रखती है जब तक दोपहर की धूप उसे बिखेर न दे।",
  inversion_svg_aria: "तीन चरणों की प्राकृतिक प्रक्रिया: रात की ठंडक, इनवर्जन ढक्कन द्वारा प्रदूषण का फँसना, और दोपहर की धूप से फैलाव",
  inversion_stage1_title: "1. ठंडी रात",
  inversion_stage1_sub: "जमीन से गर्मी का निकलना",
  inversion_stage2_title: "2. फँसा हुआ धुआँ",
  inversion_stage2_lid: "गर्म हवा का ढक्कन (इनवर्जन)",
  inversion_stage2_smog: "फँसी हुई धुंध और धुआँ",
  inversion_stage3_title: "3. धूप का असर",
  inversion_stage3_sub: "धूप से धुआँ ऊपर उठकर बिखरता है",
  inversion_step1_label: "चरण 1",
  inversion_step1_heading: "रात की ठंडक",
  inversion_step1_text: "साफ आसमान में ज़मीन तेजी से ठंडी होती है, जिससे ज़मीन से सटी हवा ऊपरी हवा से ज्यादा ठंडी हो जाती है।",
  inversion_step2_label: "चरण 2",
  inversion_step2_heading: "हवा का ढक्कन",
  inversion_step2_text: "ऊपर की गर्म हवा नीचे की ठंडी हवा को दबा देती है। गाड़ियों और चूल्हों का धुआँ ऊपर नहीं उठ पाता और सांस लेने की ऊँचाई पर फँस जाता है।",
  inversion_step3_label: "चरण 3",
  inversion_step3_heading: "दोपहर में फैलाव",
  inversion_step3_text: "दोपहर की धूप ज़मीन को गर्म करती है, जिससे हवा ऊपर उठती है और फैलाकर प्रदूषण को हल्का कर देती है।",

  // RoutineTimeline
  timeline_heading: "आज की दिनचर्या",
  timeline_subtitle: "{area} · आज के पूर्वानुमान के अनुसार",
  timeline_applies_to_aria: "लागू होता है",
  timeline_cuts_own_smog: "घर का धुआँ भी घटाता है",
  timeline_add_to_plan: "योजना में जोड़ें",
  timeline_add_to_plan_aria: "{title} को योजना में जोड़ें",
  timeline_add_calendar: "Google Calendar में जोड़ें",
  timeline_add_calendar_aria: "{title} को Google Calendar में जोड़ें",
  timeline_inversion_link: "सर्दियों की सुबह हवा सबसे खराब क्यों? →",
  timeline_ventilation_link: "खिड़कियां खोलने का सही तरीका →",

  // ChangeCard
  effort_free: "मुफ्त",
  effort_low_cost: "कम खर्च",
  effort_investment: "उपकरण",
  change_savings: "−{pct}% · {ug} µg कम",
  change_toggle_aria: "{title} को चुनें या हटाएं",
  change_hide_details: "विवरण छिपाएं ↑",
  change_show_details: "इसे कैसे करें ↓",
  change_clean_energy_note: "स्वच्छ ऊर्जा सलाह:",

  // AreaMap
  map_fallback: "इलाके का नक्शा अभी लोड नहीं हो सका।",
  map_alt: "{label} का नक्शा और PM2.5 प्रदूषण स्तर",
  map_caption: "{label} · PM2.5 हीटमैप, Google Air Quality",

  // DayStrip
  daystrip_title: "परिवार का हर घंटे का हिसाब",
  daystrip_today: "आज कुल {total} µg",
  daystrip_peak: "सबसे अधिक सांस में धुआँ {clock} बजे ({val} µg)",
  daystrip_table_caption: "{name} के लिए प्रति घंटा PM2.5 खुराक का विवरण",
  daystrip_th_hour: "समय",
  daystrip_th_dose: "सांस में धुआँ (µg)",

  // AskPanel
  ask_title: "अपनी योजना के बारे में पूछें",
  ask_subtitle: "परिवार के सदस्यों, मास्क के उपयोग, प्यूरीफायर की सेटिंग्स या यात्रा के समय के बारे में सवाल पूछें।",
  ask_input_aria: "योजना के बारे में सवाल पूछें",
  ask_placeholder_again: "एक और सवाल पूछें",
  ask_placeholder_default: "जैसे: क्या मेरी माँ को मास्क लगाना चाहिए?",
  ask_btn_loading: "योजना की जांच हो रही है…",
  ask_btn: "पूछें",
  ask_you_asked: "आपने पूछा: “{q}”",
  ask_cited_actions: "योजना के उपाय:",
  ask_disclaimer_title: "चिकित्सीय अस्वीकरण:",
  ask_disclaimer_body: "साँस दिनचर्या और सावधानियों की योजना बनाने के लिए अनुमान प्रदान करता है। यह कोई चिकित्सीय सलाह नहीं है। सांस की गंभीर समस्या या आपात स्थिति में तुरंत डॉक्टर से संपर्क करें।",

  // PlanActions
  read_aloud: "बोलकर सुनाएं",
  stop_reading: "रोकें",
  copy_brief: "संदेश कॉपी करें",
  share_btn: "साझा करें",
  print_btn: "प्रिंट करें",
  brief_copied: "संदेश कॉपी हो गया",

  // IndoorAirSection
  indoor_heading: "घर के अंदर की हवा स्वच्छ बनाएं",
  indoor_subtitle: "घर के अंदर प्रदूषण का स्तर खिड़कियों, कमरे के आकार और फिल्ट्रेशन पर निर्भर करता है।",
};
