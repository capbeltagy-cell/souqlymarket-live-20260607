export type EgyptLocation = {
  value: string;
  label_en: string;
  label_ar: string;
};

export const EGYPT_GOVERNORATES: EgyptLocation[] = [
  { value: "Cairo", label_en: "Cairo", label_ar: "القاهرة" },
  { value: "Giza", label_en: "Giza", label_ar: "الجيزة" },
  { value: "Alexandria", label_en: "Alexandria", label_ar: "الإسكندرية" },
  { value: "Dakahlia", label_en: "Dakahlia", label_ar: "الدقهلية" },
  { value: "Sharqia", label_en: "Sharqia", label_ar: "الشرقية" },
  { value: "Qalyubia", label_en: "Qalyubia", label_ar: "القليوبية" },
  { value: "Monufia", label_en: "Monufia", label_ar: "المنوفية" },
  { value: "Gharbia", label_en: "Gharbia", label_ar: "الغربية" },
  { value: "Beheira", label_en: "Beheira", label_ar: "البحيرة" },
  { value: "Kafr El Sheikh", label_en: "Kafr El Sheikh", label_ar: "كفر الشيخ" },
  { value: "Damietta", label_en: "Damietta", label_ar: "دمياط" },
  { value: "Port Said", label_en: "Port Said", label_ar: "بورسعيد" },
  { value: "Ismailia", label_en: "Ismailia", label_ar: "الإسماعيلية" },
  { value: "Suez", label_en: "Suez", label_ar: "السويس" },
  { value: "North Sinai", label_en: "North Sinai", label_ar: "شمال سيناء" },
  { value: "South Sinai", label_en: "South Sinai", label_ar: "جنوب سيناء" },
  { value: "Red Sea", label_en: "Red Sea", label_ar: "البحر الأحمر" },
  { value: "Fayoum", label_en: "Fayoum", label_ar: "الفيوم" },
  { value: "Beni Suef", label_en: "Beni Suef", label_ar: "بني سويف" },
  { value: "Minya", label_en: "Minya", label_ar: "المنيا" },
  { value: "Asyut", label_en: "Asyut", label_ar: "أسيوط" },
  { value: "Sohag", label_en: "Sohag", label_ar: "سوهاج" },
  { value: "Qena", label_en: "Qena", label_ar: "قنا" },
  { value: "Luxor", label_en: "Luxor", label_ar: "الأقصر" },
  { value: "Aswan", label_en: "Aswan", label_ar: "أسوان" },
  { value: "New Valley", label_en: "New Valley", label_ar: "الوادي الجديد" },
  { value: "Matrouh", label_en: "Matrouh", label_ar: "مطروح" },
];

export const EGYPT_CITIES_BY_GOVERNORATE: Record<string, EgyptLocation[]> = {
  Cairo: [
    { value: "Cairo Downtown", label_en: "Cairo Downtown", label_ar: "وسط القاهرة" },
    { value: "Heliopolis", label_en: "Heliopolis", label_ar: "مصر الجديدة" },
    { value: "Nasr City", label_en: "Nasr City", label_ar: "مدينة نصر" },
    { value: "New Cairo", label_en: "New Cairo", label_ar: "القاهرة الجديدة" },
    { value: "Maadi", label_en: "Maadi", label_ar: "المعادي" },
    { value: "Zamalek", label_en: "Zamalek", label_ar: "الزمالك" },
    { value: "Garden City", label_en: "Garden City", label_ar: "جاردن سيتي" },
    { value: "Shoubra", label_en: "Shoubra", label_ar: "شبرا" },
    { value: "El Marg", label_en: "El Marg", label_ar: "المرج" },
    { value: "El Matariya", label_en: "El Matariya", label_ar: "المطرية" },
    { value: "Ain Shams", label_en: "Ain Shams", label_ar: "عين شمس" },
    { value: "El Zeitoun", label_en: "El Zeitoun", label_ar: "الزيتون" },
    { value: "El Waily", label_en: "El Waily", label_ar: "الوايلي" },
    { value: "El Sahel", label_en: "El Sahel", label_ar: "الساحل" },
    { value: "El Salam", label_en: "El Salam", label_ar: "السلام" },
    { value: "El Nozha", label_en: "El Nozha", label_ar: "النزهة" },
    { value: "El Basatin", label_en: "El Basatin", label_ar: "البساتين" },
    { value: "Dar El Salam", label_en: "Dar El Salam", label_ar: "دار السلام" },
    { value: "Helwan", label_en: "Helwan", label_ar: "حلوان" },
    { value: "15th of May", label_en: "15th of May", label_ar: "15 مايو" },
    { value: "Tebin", label_en: "Tebin", label_ar: "التبين" },
    { value: "Badr City", label_en: "Badr City", label_ar: "مدينة بدر" },
    { value: "El Shorouk", label_en: "El Shorouk", label_ar: "الشروق" },
    { value: "New Administrative Capital", label_en: "New Administrative Capital", label_ar: "العاصمة الإدارية الجديدة" },
    { value: "Mokattam", label_en: "Mokattam", label_ar: "المقطم" },
    { value: "Old Cairo", label_en: "Old Cairo", label_ar: "مصر القديمة" },
    { value: "Sayeda Zeinab", label_en: "Sayeda Zeinab", label_ar: "السيدة زينب" },
    { value: "Abdeen", label_en: "Abdeen", label_ar: "عابدين" },
    { value: "Boulaq", label_en: "Boulaq", label_ar: "بولاق" },
    { value: "Rod El Farag", label_en: "Rod El Farag", label_ar: "روض الفرج" },
    { value: "El Sharabiya", label_en: "El Sharabiya", label_ar: "الشرابية" },
    { value: "El Khalifa", label_en: "El Khalifa", label_ar: "الخليفة" },
    { value: "El Mosky", label_en: "El Mosky", label_ar: "الموسكي" },
    { value: "El Gamaliya", label_en: "El Gamaliya", label_ar: "الجمالية" },
    { value: "El Darb El Ahmar", label_en: "El Darb El Ahmar", label_ar: "الدرب الأحمر" },
    { value: "Bab El Sharia", label_en: "Bab El Sharia", label_ar: "باب الشعرية" },
    { value: "El Azbakiya", label_en: "El Azbakiya", label_ar: "الأزبكية" },
    { value: "El Manial", label_en: "El Manial", label_ar: "المنيل" },
  ],
  Giza: [
    { value: "Giza", label_en: "Giza", label_ar: "الجيزة" },
    { value: "Dokki", label_en: "Dokki", label_ar: "الدقي" },
    { value: "Agouza", label_en: "Agouza", label_ar: "العجوزة" },
    { value: "Mohandessin", label_en: "Mohandessin", label_ar: "المهندسين" },
    { value: "Imbaba", label_en: "Imbaba", label_ar: "إمبابة" },
    { value: "Boulaq El Dakrour", label_en: "Boulaq El Dakrour", label_ar: "بولاق الدكرور" },
    { value: "El Haram", label_en: "El Haram", label_ar: "الهرم" },
    { value: "Faisal", label_en: "Faisal", label_ar: "فيصل" },
    { value: "El Warraq", label_en: "El Warraq", label_ar: "الوراق" },
    { value: "El Omraniya", label_en: "El Omraniya", label_ar: "العمرانية" },
    { value: "6th of October", label_en: "6th of October", label_ar: "6 أكتوبر" },
    { value: "Sheikh Zayed", label_en: "Sheikh Zayed", label_ar: "الشيخ زايد" },
    { value: "Hadayek El Ahram", label_en: "Hadayek El Ahram", label_ar: "حدائق الأهرام" },
    { value: "Saft El Laban", label_en: "Saft El Laban", label_ar: "صفط اللبن" },
    { value: "Kerdasa", label_en: "Kerdasa", label_ar: "كرداسة" },
    { value: "Ausim", label_en: "Ausim", label_ar: "أوسيم" },
    { value: "El Badrashin", label_en: "El Badrashin", label_ar: "البدرشين" },
    { value: "Atfih", label_en: "Atfih", label_ar: "أطفيح" },
    { value: "El Ayat", label_en: "El Ayat", label_ar: "العياط" },
    { value: "El Saff", label_en: "El Saff", label_ar: "الصف" },
    { value: "El Hawamdiya", label_en: "El Hawamdiya", label_ar: "الحوامدية" },
    { value: "Abu Nomrus", label_en: "Abu Nomrus", label_ar: "أبو النمرس" },
    { value: "Manshaat El Qanater", label_en: "Manshaat El Qanater", label_ar: "منشأة القناطر" },
  ],
  Alexandria: [
    { value: "Alexandria", label_en: "Alexandria", label_ar: "الإسكندرية" },
    { value: "Sidi Gaber", label_en: "Sidi Gaber", label_ar: "سيدي جابر" },
    { value: "Smouha", label_en: "Smouha", label_ar: "سموحة" },
    { value: "Miami", label_en: "Miami", label_ar: "ميامي" },
    { value: "Montaza", label_en: "Montaza", label_ar: "المنتزه" },
    { value: "Mandara", label_en: "Mandara", label_ar: "المندرة" },
    { value: "Asafra", label_en: "Asafra", label_ar: "العصافرة" },
    { value: "Sidi Bishr", label_en: "Sidi Bishr", label_ar: "سيدي بشر" },
    { value: "Gleem", label_en: "Gleem", label_ar: "جليم" },
    { value: "Stanley", label_en: "Stanley", label_ar: "ستانلي" },
    { value: "Roushdy", label_en: "Roushdy", label_ar: "رشدي" },
    { value: "Bulkeley", label_en: "Bulkeley", label_ar: "بولكلي" },
    { value: "Camp Chezar", label_en: "Camp Chezar", label_ar: "كامب شيزار" },
    { value: "Ibrahimeya", label_en: "Ibrahimeya", label_ar: "الإبراهيمية" },
    { value: "Cleopatra", label_en: "Cleopatra", label_ar: "كليوباترا" },
    { value: "Bacos", label_en: "Bacos", label_ar: "باكوس" },
    { value: "El Mansheya", label_en: "El Mansheya", label_ar: "المنشية" },
    { value: "El Attarin", label_en: "El Attarin", label_ar: "العطارين" },
    { value: "El Labban", label_en: "El Labban", label_ar: "اللبان" },
    { value: "El Gomrok", label_en: "El Gomrok", label_ar: "الجمرك" },
    { value: "Karmouz", label_en: "Karmouz", label_ar: "كرموز" },
    { value: "Moharram Bek", label_en: "Moharram Bek", label_ar: "محرم بك" },
    { value: "El Amreya", label_en: "El Amreya", label_ar: "العامرية" },
    { value: "Agami", label_en: "Agami", label_ar: "العجمي" },
    { value: "King Mariout", label_en: "King Mariout", label_ar: "كينج مريوط" },
    { value: "Borg El Arab", label_en: "Borg El Arab", label_ar: "برج العرب" },
    { value: "New Borg El Arab", label_en: "New Borg El Arab", label_ar: "برج العرب الجديدة" },
    { value: "Abu Qir", label_en: "Abu Qir", label_ar: "أبو قير" },
    { value: "El Max", label_en: "El Max", label_ar: "المكس" },
    { value: "Dekheila", label_en: "Dekheila", label_ar: "الدخيلة" },
  ],
  Dakahlia: [
    { value: "Mansoura", label_en: "Mansoura", label_ar: "المنصورة" },
    { value: "Talkha", label_en: "Talkha", label_ar: "طلخا" },
    { value: "Mit Ghamr", label_en: "Mit Ghamr", label_ar: "ميت غمر" },
    { value: "Aga", label_en: "Aga", label_ar: "أجا" },
    { value: "Sherbin", label_en: "Sherbin", label_ar: "شربين" },
    { value: "Belqas", label_en: "Belqas", label_ar: "بلقاس" },
    { value: "Meet Salsil", label_en: "Meet Salsil", label_ar: "ميت سلسيل" },
    { value: "Gamasa", label_en: "Gamasa", label_ar: "جمصة" },
    { value: "El Manzala", label_en: "El Manzala", label_ar: "المنزلة" },
    { value: "El Matareya", label_en: "El Matareya", label_ar: "المطرية" },
    { value: "Dekernes", label_en: "Dekernes", label_ar: "دكرنس" },
    { value: "Bani Ubaid", label_en: "Bani Ubaid", label_ar: "بني عبيد" },
    { value: "El Senbellawein", label_en: "El Senbellawein", label_ar: "السنبلاوين" },
    { value: "Minyet El Nasr", label_en: "Minyet El Nasr", label_ar: "منية النصر" },
    { value: "Nabaroh", label_en: "Nabaroh", label_ar: "نبروه" },
    { value: "Timai El Amdid", label_en: "Timai El Amdid", label_ar: "تمي الأمديد" },
    { value: "El Kurdi", label_en: "El Kurdi", label_ar: "الكردي" },
  ],
  Sharqia: [
    { value: "Zagazig", label_en: "Zagazig", label_ar: "الزقازيق" },
    { value: "10th of Ramadan", label_en: "10th of Ramadan", label_ar: "العاشر من رمضان" },
    { value: "Belbeis", label_en: "Belbeis", label_ar: "بلبيس" },
    { value: "Abu Hammad", label_en: "Abu Hammad", label_ar: "أبو حماد" },
    { value: "Abu Kabir", label_en: "Abu Kabir", label_ar: "أبو كبير" },
    { value: "El Ibrahimiya", label_en: "El Ibrahimiya", label_ar: "الإبراهيمية" },
    { value: "Faqous", label_en: "Faqous", label_ar: "فاقوس" },
    { value: "Hehia", label_en: "Hehia", label_ar: "ههيا" },
    { value: "Kafr Saqr", label_en: "Kafr Saqr", label_ar: "كفر صقر" },
    { value: "Mashtool El Souk", label_en: "Mashtool El Souk", label_ar: "مشتول السوق" },
    { value: "Minya El Qamh", label_en: "Minya El Qamh", label_ar: "منيا القمح" },
    { value: "El Qanayat", label_en: "El Qanayat", label_ar: "القنايات" },
    { value: "El Qurain", label_en: "El Qurain", label_ar: "القرين" },
    { value: "El Salhia El Gadida", label_en: "El Salhia El Gadida", label_ar: "الصالحية الجديدة" },
    { value: "San El Hagar", label_en: "San El Hagar", label_ar: "صان الحجر" },
    { value: "Awlad Saqr", label_en: "Awlad Saqr", label_ar: "أولاد صقر" },
    { value: "Deirb Negm", label_en: "Deirb Negm", label_ar: "ديرب نجم" },
    { value: "El Husseiniya", label_en: "El Husseiniya", label_ar: "الحسينية" },
  ],
  Qalyubia: [
    { value: "Banha", label_en: "Banha", label_ar: "بنها" },
    { value: "Shubra El Kheima", label_en: "Shubra El Kheima", label_ar: "شبرا الخيمة" },
    { value: "Qalyub", label_en: "Qalyub", label_ar: "قليوب" },
    { value: "Qaha", label_en: "Qaha", label_ar: "قها" },
    { value: "Tukh", label_en: "Tukh", label_ar: "طوخ" },
    { value: "Khanka", label_en: "Khanka", label_ar: "الخانكة" },
    { value: "Kafr Shukr", label_en: "Kafr Shukr", label_ar: "كفر شكر" },
    { value: "Shibin El Qanater", label_en: "Shibin El Qanater", label_ar: "شبين القناطر" },
    { value: "El Qanater El Khayriya", label_en: "El Qanater El Khayriya", label_ar: "القناطر الخيرية" },
    { value: "El Obour", label_en: "El Obour", label_ar: "العبور" },
    { value: "15th of May City", label_en: "15th of May City", label_ar: "مدينة 15 مايو" },
    { value: "El Khusus", label_en: "El Khusus", label_ar: "الخصوص" },
  ],
  Monufia: [
    { value: "Shibin El Kom", label_en: "Shibin El Kom", label_ar: "شبين الكوم" },
    { value: "Menouf", label_en: "Menouf", label_ar: "منوف" },
    { value: "Sadat City", label_en: "Sadat City", label_ar: "مدينة السادات" },
    { value: "Ashmoun", label_en: "Ashmoun", label_ar: "أشمون" },
    { value: "Berket El Sabaa", label_en: "Berket El Sabaa", label_ar: "بركة السبع" },
    { value: "Quesna", label_en: "Quesna", label_ar: "قويسنا" },
    { value: "El Bagour", label_en: "El Bagour", label_ar: "الباجور" },
    { value: "El Shohada", label_en: "El Shohada", label_ar: "الشهداء" },
    { value: "Tala", label_en: "Tala", label_ar: "تلا" },
    { value: "El Sadat", label_en: "El Sadat", label_ar: "السادات" },
  ],
  Gharbia: [
    { value: "Tanta", label_en: "Tanta", label_ar: "طنطا" },
    { value: "El Mahalla El Kubra", label_en: "El Mahalla El Kubra", label_ar: "المحلة الكبرى" },
    { value: "Kafr El Zayat", label_en: "Kafr El Zayat", label_ar: "كفر الزيات" },
    { value: "Zefta", label_en: "Zefta", label_ar: "زفتى" },
    { value: "El Santa", label_en: "El Santa", label_ar: "السنطة" },
    { value: "Qutour", label_en: "Qutour", label_ar: "قطور" },
    { value: "Basyoun", label_en: "Basyoun", label_ar: "بسيون" },
    { value: "Samannoud", label_en: "Samannoud", label_ar: "سمنود" },
  ],
  Beheira: [
    { value: "Damanhour", label_en: "Damanhour", label_ar: "دمنهور" },
    { value: "Kafr El Dawwar", label_en: "Kafr El Dawwar", label_ar: "كفر الدوار" },
    { value: "Rashid", label_en: "Rashid", label_ar: "رشيد" },
    { value: "Edku", label_en: "Edku", label_ar: "إدكو" },
    { value: "Abu El Matamir", label_en: "Abu El Matamir", label_ar: "أبو المطامير" },
    { value: "Abu Hummus", label_en: "Abu Hummus", label_ar: "أبو حمص" },
    { value: "El Delengat", label_en: "El Delengat", label_ar: "الدلنجات" },
    { value: "El Mahmoudiya", label_en: "El Mahmoudiya", label_ar: "المحمودية" },
    { value: "El Rahmaniya", label_en: "El Rahmaniya", label_ar: "الرحمانية" },
    { value: "Etay El Baroud", label_en: "Etay El Baroud", label_ar: "إيتاي البارود" },
    { value: "Hosh Eissa", label_en: "Hosh Eissa", label_ar: "حوش عيسى" },
    { value: "Kom Hamada", label_en: "Kom Hamada", label_ar: "كوم حمادة" },
    { value: "Shubrakhit", label_en: "Shubrakhit", label_ar: "شبراخيت" },
    { value: "Wadi El Natrun", label_en: "Wadi El Natrun", label_ar: "وادي النطرون" },
    { value: "New Nubariya", label_en: "New Nubariya", label_ar: "النوبارية الجديدة" },
  ],
  "Kafr El Sheikh": [
    { value: "Kafr El Sheikh", label_en: "Kafr El Sheikh", label_ar: "كفر الشيخ" },
    { value: "Desouk", label_en: "Desouk", label_ar: "دسوق" },
    { value: "Fuwwah", label_en: "Fuwwah", label_ar: "فوه" },
    { value: "Metoubes", label_en: "Metoubes", label_ar: "مطوبس" },
    { value: "Burullus", label_en: "Burullus", label_ar: "البرلس" },
    { value: "Baltim", label_en: "Baltim", label_ar: "بلطيم" },
    { value: "Hamool", label_en: "Hamool", label_ar: "الحامول" },
    { value: "Bila", label_en: "Bila", label_ar: "بيلا" },
    { value: "Sidi Salem", label_en: "Sidi Salem", label_ar: "سيدي سالم" },
    { value: "Qellin", label_en: "Qellin", label_ar: "قلين" },
    { value: "El Reyad", label_en: "El Reyad", label_ar: "الرياض" },
  ],
  Damietta: [
    { value: "Damietta", label_en: "Damietta", label_ar: "دمياط" },
    { value: "New Damietta", label_en: "New Damietta", label_ar: "دمياط الجديدة" },
    { value: "Ras El Bar", label_en: "Ras El Bar", label_ar: "رأس البر" },
    { value: "Faraskur", label_en: "Faraskur", label_ar: "فارسكور" },
    { value: "Kafr Saad", label_en: "Kafr Saad", label_ar: "كفر سعد" },
    { value: "Kafr El Battikh", label_en: "Kafr El Battikh", label_ar: "كفر البطيخ" },
    { value: "El Zarqa", label_en: "El Zarqa", label_ar: "الزرقا" },
    { value: "El Sarw", label_en: "El Sarw", label_ar: "السرو" },
    { value: "Meet Abu Ghalib", label_en: "Meet Abu Ghalib", label_ar: "ميت أبو غالب" },
  ],
  "Port Said": [
    { value: "Port Said", label_en: "Port Said", label_ar: "بورسعيد" },
    { value: "Port Fouad", label_en: "Port Fouad", label_ar: "بورفؤاد" },
    { value: "El Manakh", label_en: "El Manakh", label_ar: "المناخ" },
    { value: "El Arab", label_en: "El Arab", label_ar: "العرب" },
    { value: "El Sharq", label_en: "El Sharq", label_ar: "الشرق" },
    { value: "El Dawahi", label_en: "El Dawahi", label_ar: "الضواحي" },
    { value: "El Zohour", label_en: "El Zohour", label_ar: "الزهور" },
    { value: "El Ganoub", label_en: "El Ganoub", label_ar: "الجنوب" },
  ],
  Ismailia: [
    { value: "Ismailia", label_en: "Ismailia", label_ar: "الإسماعيلية" },
    { value: "Fayed", label_en: "Fayed", label_ar: "فايد" },
    { value: "El Qantara Gharb", label_en: "El Qantara Gharb", label_ar: "القنطرة غرب" },
    { value: "El Qantara Sharq", label_en: "El Qantara Sharq", label_ar: "القنطرة شرق" },
    { value: "El Tal El Kebir", label_en: "El Tal El Kebir", label_ar: "التل الكبير" },
    { value: "Abu Suwir", label_en: "Abu Suwir", label_ar: "أبو صوير" },
    { value: "Kassassin", label_en: "Kassassin", label_ar: "القصاصين" },
    { value: "Nefisha", label_en: "Nefisha", label_ar: "نفيشة" },
  ],
  Suez: [
    { value: "Suez", label_en: "Suez", label_ar: "السويس" },
    { value: "Arbaeen", label_en: "Arbaeen", label_ar: "الأربعين" },
    { value: "El Ganayen", label_en: "El Ganayen", label_ar: "الجناين" },
    { value: "Attaka", label_en: "Attaka", label_ar: "عتاقة" },
    { value: "Faisal", label_en: "Faisal", label_ar: "فيصل" },
    { value: "Ain Sokhna", label_en: "Ain Sokhna", label_ar: "العين السخنة" },
  ],
  "North Sinai": [
    { value: "Al Arish", label_en: "Al Arish", label_ar: "العريش" },
    { value: "Bir El Abd", label_en: "Bir El Abd", label_ar: "بئر العبد" },
    { value: "Sheikh Zuweid", label_en: "Sheikh Zuweid", label_ar: "الشيخ زويد" },
    { value: "Rafah", label_en: "Rafah", label_ar: "رفح" },
    { value: "El Hasana", label_en: "El Hasana", label_ar: "الحسنة" },
    { value: "Nakhl", label_en: "Nakhl", label_ar: "نخل" },
  ],
  "South Sinai": [
    { value: "El Tor", label_en: "El Tor", label_ar: "الطور" },
    { value: "Sharm El Sheikh", label_en: "Sharm El Sheikh", label_ar: "شرم الشيخ" },
    { value: "Dahab", label_en: "Dahab", label_ar: "دهب" },
    { value: "Nuweiba", label_en: "Nuweiba", label_ar: "نويبع" },
    { value: "Taba", label_en: "Taba", label_ar: "طابا" },
    { value: "Saint Catherine", label_en: "Saint Catherine", label_ar: "سانت كاترين" },
    { value: "Abu Redis", label_en: "Abu Redis", label_ar: "أبو رديس" },
    { value: "Ras Sedr", label_en: "Ras Sedr", label_ar: "رأس سدر" },
  ],
  "Red Sea": [
    { value: "Hurghada", label_en: "Hurghada", label_ar: "الغردقة" },
    { value: "Safaga", label_en: "Safaga", label_ar: "سفاجا" },
    { value: "Quseir", label_en: "Quseir", label_ar: "القصير" },
    { value: "Marsa Alam", label_en: "Marsa Alam", label_ar: "مرسى علم" },
    { value: "Ras Ghareb", label_en: "Ras Ghareb", label_ar: "رأس غارب" },
    { value: "El Shalateen", label_en: "El Shalateen", label_ar: "الشلاتين" },
    { value: "Halayeb", label_en: "Halayeb", label_ar: "حلايب" },
    { value: "El Gouna", label_en: "El Gouna", label_ar: "الجونة" },
  ],
  Fayoum: [
    { value: "Fayoum", label_en: "Fayoum", label_ar: "الفيوم" },
    { value: "New Fayoum", label_en: "New Fayoum", label_ar: "الفيوم الجديدة" },
    { value: "Sinnuris", label_en: "Sinnuris", label_ar: "سنورس" },
    { value: "Ibshway", label_en: "Ibshway", label_ar: "إبشواي" },
    { value: "Etsa", label_en: "Etsa", label_ar: "إطسا" },
    { value: "Tamiya", label_en: "Tamiya", label_ar: "طامية" },
    { value: "Youssef El Sedeek", label_en: "Youssef El Sedeek", label_ar: "يوسف الصديق" },
  ],
  "Beni Suef": [
    { value: "Beni Suef", label_en: "Beni Suef", label_ar: "بني سويف" },
    { value: "New Beni Suef", label_en: "New Beni Suef", label_ar: "بني سويف الجديدة" },
    { value: "El Wasta", label_en: "El Wasta", label_ar: "الواسطى" },
    { value: "Nasser", label_en: "Nasser", label_ar: "ناصر" },
    { value: "Ihnasia", label_en: "Ihnasia", label_ar: "إهناسيا" },
    { value: "Biba", label_en: "Biba", label_ar: "ببا" },
    { value: "Sumusta El Waqf", label_en: "Sumusta El Waqf", label_ar: "سمسطا" },
    { value: "El Fashn", label_en: "El Fashn", label_ar: "الفشن" },
  ],
  Minya: [
    { value: "Minya", label_en: "Minya", label_ar: "المنيا" },
    { value: "New Minya", label_en: "New Minya", label_ar: "المنيا الجديدة" },
    { value: "El Idwa", label_en: "El Idwa", label_ar: "العدوة" },
    { value: "Maghagha", label_en: "Maghagha", label_ar: "مغاغة" },
    { value: "Beni Mazar", label_en: "Beni Mazar", label_ar: "بني مزار" },
    { value: "Matai", label_en: "Matai", label_ar: "مطاي" },
    { value: "Samalut", label_en: "Samalut", label_ar: "سمالوط" },
    { value: "Abu Qurqas", label_en: "Abu Qurqas", label_ar: "أبو قرقاص" },
    { value: "Mallawi", label_en: "Mallawi", label_ar: "ملوي" },
    { value: "Deir Mawas", label_en: "Deir Mawas", label_ar: "دير مواس" },
  ],
  Asyut: [
    { value: "Asyut", label_en: "Asyut", label_ar: "أسيوط" },
    { value: "New Asyut", label_en: "New Asyut", label_ar: "أسيوط الجديدة" },
    { value: "Dairut", label_en: "Dairut", label_ar: "ديروط" },
    { value: "Manfalut", label_en: "Manfalut", label_ar: "منفلوط" },
    { value: "El Qusiya", label_en: "El Qusiya", label_ar: "القوصية" },
    { value: "Abnub", label_en: "Abnub", label_ar: "أبنوب" },
    { value: "Abu Tig", label_en: "Abu Tig", label_ar: "أبو تيج" },
    { value: "El Ghanayem", label_en: "El Ghanayem", label_ar: "الغنايم" },
    { value: "Sahel Selim", label_en: "Sahel Selim", label_ar: "ساحل سليم" },
    { value: "El Badari", label_en: "El Badari", label_ar: "البداري" },
    { value: "El Fath", label_en: "El Fath", label_ar: "الفتح" },
    { value: "Sedfa", label_en: "Sedfa", label_ar: "صدفا" },
  ],
  Sohag: [
    { value: "Sohag", label_en: "Sohag", label_ar: "سوهاج" },
    { value: "New Sohag", label_en: "New Sohag", label_ar: "سوهاج الجديدة" },
    { value: "Akhmim", label_en: "Akhmim", label_ar: "أخميم" },
    { value: "New Akhmim", label_en: "New Akhmim", label_ar: "أخميم الجديدة" },
    { value: "El Balina", label_en: "El Balina", label_ar: "البلينا" },
    { value: "El Maragha", label_en: "El Maragha", label_ar: "المراغة" },
    { value: "El Menshah", label_en: "El Menshah", label_ar: "المنشأة" },
    { value: "Dar El Salam", label_en: "Dar El Salam", label_ar: "دار السلام" },
    { value: "Girga", label_en: "Girga", label_ar: "جرجا" },
    { value: "Juhaina", label_en: "Juhaina", label_ar: "جهينة" },
    { value: "Saqulta", label_en: "Saqulta", label_ar: "ساقلتة" },
    { value: "Tahta", label_en: "Tahta", label_ar: "طهطا" },
									      { value: "Tama", label_en: "Tama", label_ar: "طما" },
  ],
  Qena: [
    { value: "Qena", label_en: "Qena", label_ar: "قنا" },
    { value: "New Qena", label_en: "New Qena", label_ar: "قنا الجديدة" },
    { value: "Abu Tesht", label_en: "Abu Tesht", label_ar: "أبو تشت" },
    { value: "Farshut", label_en: "Farshut", label_ar: "فرشوط" },
    { value: "Nag Hammadi", label_en: "Nag Hammadi", label_ar: "نجع حمادي" },
    { value: "Dishna", label_en: "Dishna", label_ar: "دشنا" },
    { value: "El Waqf", label_en: "El Waqf", label_ar: "الوقف" },
    { value: "Qift", label_en: "Qift", label_ar: "قفط" },
    { value: "Qus", label_en: "Qus", label_ar: "قوص" },
    { value: "Naqada", label_en: "Naqada", label_ar: "نقادة" },
  ],
  Luxor: [
    { value: "Luxor", label_en: "Luxor", label_ar: "الأقصر" },
    { value: "New Luxor", label_en: "New Luxor", label_ar: "الأقصر الجديدة" },
    { value: "Esna", label_en: "Esna", label_ar: "إسنا" },
    { value: "New Tiba", label_en: "New Tiba", label_ar: "طيبة الجديدة" },
    { value: "Armant", label_en: "Armant", label_ar: "أرمنت" },
    { value: "El Bayadiya", label_en: "El Bayadiya", label_ar: "البياضية" },
    { value: "El Zeiniya", label_en: "El Zeiniya", label_ar: "الزينية" },
    { value: "El Qurna", label_en: "El Qurna", label_ar: "القرنة" },
    { value: "El Tod", label_en: "El Tod", label_ar: "الطود" },
  ],
  Aswan: [
    { value: "Aswan", label_en: "Aswan", label_ar: "أسوان" },
    { value: "New Aswan", label_en: "New Aswan", label_ar: "أسوان الجديدة" },
    { value: "Draw", label_en: "Draw", label_ar: "دراو" },
    { value: "Kom Ombo", label_en: "Kom Ombo", label_ar: "كوم أمبو" },
    { value: "Nasr El Nuba", label_en: "Nasr El Nuba", label_ar: "نصر النوبة" },
    { value: "Kalabsha", label_en: "Kalabsha", label_ar: "كلابشة" },
    { value: "Edfu", label_en: "Edfu", label_ar: "إدفو" },
    { value: "Al Radesyah", label_en: "Al Radesyah", label_ar: "الرديسية" },
    { value: "El Basaliya", label_en: "El Basaliya", label_ar: "البصيلية" },
    { value: "Abu Simbel", label_en: "Abu Simbel", label_ar: "أبو سمبل" },
  ],
  "New Valley": [
    { value: "El Kharga", label_en: "El Kharga", label_ar: "الخارجة" },
    { value: "Paris", label_en: "Paris", label_ar: "باريس" },
    { value: "Mout (Dakhla)", label_en: "Mout (Dakhla)", label_ar: "موط (الداخلة)" },
    { value: "Balat", label_en: "Balat", label_ar: "بلاط" },
    { value: "Farafra", label_en: "Farafra", label_ar: "الفرافرة" },
    { value: "El Qasr", label_en: "El Qasr", label_ar: "القصر" },
  ],
  Matrouh: [
    { value: "Marsa Matrouh", label_en: "Marsa Matrouh", label_ar: "مرسى مطروح" },
    { value: "El Alamein", label_en: "El Alamein", label_ar: "العلمين" },
    { value: "New Alamein", label_en: "New Alamein", label_ar: "العلمين الجديدة" },
    { value: "El Dabaa", label_en: "El Dabaa", label_ar: "الضبعة" },
    { value: "El Hammam", label_en: "El Hammam", label_ar: "الحمام" },
    { value: "El Negaila", label_en: "El Negaila", label_ar: "النجيلة" },
    { value: "Sidi Barrani", label_en: "Sidi Barrani", label_ar: "سيدي براني" },
    { value: "El Salloum", label_en: "El Salloum", label_ar: "السلوم" },
    { value: "Siwa", label_en: "Siwa", label_ar: "سيوة" },
    { value: "North Coast", label_en: "North Coast", label_ar: "الساحل الشمالي" },
  ],
};


const normalize = (value: string | null | undefined) => {
  if (!value) return null;
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
};

export function findGovernorateOption(value: string | null | undefined): EgyptLocation | undefined {
  const normalized = normalize(value);
  if (!normalized) return undefined;
  return EGYPT_GOVERNORATES.find((gov) =>
    [gov.value, gov.label_en, gov.label_ar].some((label) => label.toLowerCase() === normalized.toLowerCase()),
  );
}

export function findCityOption(value: string | null | undefined): EgyptLocation | undefined {
  const normalized = normalize(value);
  if (!normalized) return undefined;
  for (const cities of Object.values(EGYPT_CITIES_BY_GOVERNORATE)) {
    const found = cities.find((city) =>
      [city.value, city.label_en, city.label_ar].some((label) => label.toLowerCase() === normalized.toLowerCase()),
    );
    if (found) return found;
  }
  return undefined;
}

export function normalizeEgyptGovernorate(value: string | null | undefined): string | null {
  const found = findGovernorateOption(value);
  return found ? found.value : normalize(value);
}

export function normalizeEgyptCity(value: string | null | undefined): string | null {
  const found = findCityOption(value);
  return found ? found.value : normalize(value);
}

export function translateEgyptGovernorate(value: string | null | undefined, locale: "en" | "ar" = "en"): string | null {
  const found = findGovernorateOption(value);
  if (!found) return normalize(value);
  return locale === "ar" ? found.label_ar : found.label_en;
}

export function translateEgyptCity(value: string | null | undefined, locale: "en" | "ar" = "en"): string | null {
  const found = findCityOption(value);
  if (!found) return normalize(value);
  return locale === "ar" ? found.label_ar : found.label_en;
}

export function getCitiesForGovernorate(governorate: string | null | undefined): EgyptLocation[] {
  const normalized = normalizeEgyptGovernorate(governorate);
  if (!normalized) return [];
  return EGYPT_CITIES_BY_GOVERNORATE[normalized] ?? [];
}

export function getGovernorateVariants(governorate: string | null | undefined): string[] {
  const found = findGovernorateOption(governorate);
  if (!found) return governorate ? [governorate.trim()] : [];
  return Array.from(new Set([found.value, found.label_ar]));
}

export function getCityVariants(city: string | null | undefined): string[] {
  const found = findCityOption(city);
  if (!found) return city ? [city.trim()] : [];
  return Array.from(new Set([found.value, found.label_ar]));
}
