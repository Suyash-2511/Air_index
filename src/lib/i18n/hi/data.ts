/** Hindi translations for data text, pollutants, AQI, schedule warnings and routine rules. */
export const hiData = {
  // AQI categories
  aqi_cat_good: "अच्छा",
  aqi_cat_satisfactory: "संतोषजनक",
  aqi_cat_moderate: "मध्यम",
  aqi_cat_poor: "खराब",
  aqi_cat_very_poor: "बहुत खराब",
  aqi_cat_severe: "गंभीर",

  // Criteria pollutants
  pollutant_name_pm25: "महीन धूल और धुएं के कण (PM2.5)",
  pollutant_sources_pm25: "गाड़ियों का धुआँ, लकड़ी और कोयला जलना, औद्योगिक उत्सर्जन, सड़क की धूल।",
  pollutant_effects_pm25: "फेफड़ों की गहराई तक जाकर खून में मिल जाते हैं, जिससे सांस और दिल की गंभीर बीमारियां होती हैं।",
  pollutant_at_risk_pm25: "बच्चे, बुजुर्ग, गर्भवती महिलाएं और दिल या फेफड़ों के मरीज।",

  pollutant_name_pm10: "मोटी धूल के कण (PM10)",
  pollutant_sources_pm10: "निर्माण कार्य, कच्ची सड़कें, धूल भरी हवा, खेतों में पराली जलना।",
  pollutant_effects_pm10: "सांस की नली, आँखों और गले में जलन पैदा करता है, ब्रोंकाइटिस और अस्थमा को बढ़ाता है।",
  pollutant_at_risk_pm10: "बाहर काम करने वाले, बच्चे और सांस की बीमारी से पीड़ित लोग।",

  pollutant_name_no2: "नाइट्रोजन डाइऑक्साइड (NO2)",
  pollutant_sources_no2: "गाड़ियां, डीजल जनरेटर, बिजली संयंत्र, गैस चूल्हे।",
  pollutant_effects_no2: "फेफड़ों में सूजन लाता है, संक्रमण से लड़ने की ताकत घटाता है और अस्थमा का दौरा बढ़ा सकता है।",
  pollutant_at_risk_no2: "यात्री, व्यस्त सड़कों के पास रहने वाले बच्चे और अस्थमा रोगी।",

  pollutant_name_o3: "ओजोन (O3)",
  pollutant_sources_o3: "धूप में गाड़ियों के धुएं और रसायनों की रासायनिक क्रिया से बनता है।",
  pollutant_effects_o3: "फेफड़ों के ऊतकों में जलन करता है, छाती में जकड़न, खांसी और सांस फूलने की समस्या पैदा करता है।",
  pollutant_at_risk_o3: "धूप में बाहर खेलने वाले बच्चे, खिलाड़ी और अस्थमा रोगी।",

  pollutant_name_co: "कार्बन मोनोऑक्साइड (CO)",
  pollutant_sources_co: "पेट्रोल गाड़ियों, लकड़ी/कोयले के चूल्हों और जनरेटर में अधूरा दहन।",
  pollutant_effects_co: "ऑक्सीजन की जगह खून के हीमोग्लोबिन से जुड़ जाता है, जिससे चक्कर, थकान और दिल पर दबाव बढ़ता है।",
  pollutant_at_risk_co: "दिल की बीमारी के मरीज, नवजात शिशु और ट्रैफिक में काम करने वाले।",

  pollutant_name_so2: "सल्फर डाइऑक्साइड (SO2)",
  pollutant_sources_so2: "कोयला बिजली घर, तेल रिफाइनरी और औद्योगिक कारखाने।",
  pollutant_effects_so2: "सांस की नली को तेजी से सिकोड़ता है, गले में जलन करता है और सांस की बीमारियों को गंभीर बनाता है।",
  pollutant_at_risk_so2: "बाहर कसरत करने वाले अस्थमा रोगी, बुजुर्ग और औद्योगिक इलाकों के लोग।",

  // Schedule validation warnings
  sched_empty: "इस दिन के लिए कम से कम एक समय खंड जोड़ें।",
  sched_needs_length: "{desc} की अवधि तय करनी होगी।",
  sched_too_long: "{desc} पूरे दिन से भी लंबा है।",
  sched_day_over_24: "दिन के कुल घंटे {total} हो रहे हैं, जो 24 घंटे से {extra} घंटे अधिक है। किसी खंड को छोटा करें।",
  sched_overlap: "{desc1} का समय {desc2} से टकरा रहा है। किसी एक का समय बदलें।",
  sched_another_block: "दूसरे समय खंड",
  sched_at_clock: "{name} ({clock} बजे)",

  // Routine items
  routine_title_open_windows: "15 मिनट के लिए खिड़कियाँ खोलें",
  routine_detail_open_windows: "आज दिन की सबसे साफ हवा, लगभग {pm25} µg/m³।",
  routine_title_outdoor: "बाहर जाने का सबसे अच्छा समय",
  routine_detail_outdoor: "{names} के बाहर रहने के लिए सबसे कम धुंध वाला समय, लगभग {pm25} µg/m³।",
  routine_detail_outdoor_ozone_alt: "{names} के बाहर रहने के लिए अगला सबसे अच्छा समय, लगभग {pm25} µg/m³; दोपहर में ओजोन {o3} µg/m³ तक बढ़ जाता है।",
  routine_detail_outdoor_ozone_warn: "{names} के बाहर रहने के लिए सबसे कम धुंध वाला समय, लगभग {pm25} µg/m³, लेकिन दोपहर में ओजोन अधिक है ({o3} µg/m³)।",
  routine_title_keep_windows_shut: "खिड़कियाँ बंद रखें",
  routine_detail_keep_windows_shut_limit: "बाहरी PM2.5 औसत {pm25} µg/m³ है, जो मानक से लगभग {times} गुना है।",
  routine_detail_keep_windows_shut: "बाहरी PM2.5 औसत {pm25} µg/m³ है।",
  routine_title_commute_n95: "बाहर जाते समय N95 मास्क पहनें",
  routine_title_commute_public: "साइकिल के बजाय बस या मेट्रो लें",
  routine_title_commute_mask_cycle: "साइकिल चलाते समय N95 मास्क पहनें",
  routine_title_commute_mask_walk: "पैदल चलते समय N95 मास्क पहनें",
  routine_title_commute_recirculate: "कार की खिड़कियाँ बंद रखें और रीसर्क्युलेशन चालू रखें",
  routine_detail_commute: "{name} का सफर: बाहरी PM2.5 लगभग {pm25} µg/m³ है।",
  routine_detail_commute_you: "आपका सफर: बाहरी PM2.5 लगभग {pm25} µg/m³ है।",
  routine_title_cook_chimney: "खाना पकाते समय चिमनी या एग्जॉस्ट चलाएं",
  routine_title_cook_door: "रसोई का दरवाजा बंद रखकर खाना पकाएं",
  routine_title_clean_fuel: "स्वच्छ कुकिंग ईंधन (LPG/PNG) अपनाएं",
  routine_detail_cook: "खाना पकाने से घर में PM2.5 बढ़ता है; बाहर की हवा {pm25} µg/m³ है।",
  routine_title_sleep_purifier: "खिड़कियाँ बंद रखें, बेडरूम में प्यूरीफायर चलाएं",
  routine_title_sleep_shut: "सोने से पहले खिड़कियाँ बंद कर लें",
  routine_detail_sleep: "रात भर बाहरी PM2.5 लगभग {pm25} µg/m³ रहने का अनुमान है।",

  // Loading and error banners
  loading_calculating_plan: "सांस में जाने वाले धुएं का हिसाब लगाया जा रहा है और सुरक्षा उपाय तय हो रहे हैं...",
  error_calculating_plan: "सुरक्षा योजना की गणना करने में विफल",
};
