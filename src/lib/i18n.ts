import { useAppStore } from "./store";

const dictionary = {
  en: {
    // LayoutShell
    "app.title": "Udyam",
    "app.titleSuffix": "AI",
    "lang.toggle": "हिंदी",
    "nav.discover": "Discover",
    "nav.community": "Community",
    "nav.profile": "Profile",
    "user.name": "Rajesh Kumar",

    // JourneyStepper
    "step.discover": "Discover",
    "step.analyse": "Analyse",
    "step.finance": "Finance",
    "step.connect": "Connect",
    "step.manage": "Manage",
    "step.grow": "Grow",

    // Landing Page
    "landing.badge": "UdyamAI 2.0 Is Here",
    "landing.headline.part1": "Transform local ideas into ",
    "landing.headline.part2": "funded realities.",
    "landing.description": "The operating system for rural entrepreneurship. We combine hyper-local data intelligence with automated financial structuring to help you discover, validate, and fund your next business.",
    "landing.cta.start": "Start Your Journey",
    "landing.cta.explore": "Explore Market Data",
    
    // Trusted By
    "landing.trusted.title": "TRUSTED BY LEADING GRASSROOTS ORGANIZATIONS",

    // Bento Grid Features
    "landing.feature1.title": "Hyper-local Market Intelligence",
    "landing.feature1.desc": "Visualize competitor density, supply chains, and consumer demand specific to your block using our proprietary geospatial AI models.",
    
    "landing.feature2.title": "Instant Feasibility Analysis",
    "landing.feature2.desc": "Generate bank-ready SWOT reports and viability scores in seconds. We analyze local saturation to protect your investments.",
    
    "landing.feature3.title": "Automated Financial Structuring",
    "landing.feature3.desc": "Instantly calculate project costs, subsidy eligibility (PMEGP), and EMI schedules adjusted for moratorium periods."
  },
  hi: {
    // LayoutShell
    "app.title": "उद्यम",
    "app.titleSuffix": "AI",
    "lang.toggle": "English",
    "nav.discover": "खोजें",
    "nav.community": "समुदाय",
    "nav.profile": "प्रोफ़ाइल",
    "user.name": "राजेश कुमार",

    // JourneyStepper
    "step.discover": "खोजें",
    "step.analyse": "विश्लेषण",
    "step.finance": "वित्त",
    "step.connect": "जुड़ें",
    "step.manage": "प्रबंधन",
    "step.grow": "विकास",

    // Landing Page
    "landing.badge": "उद्यमAI 2.0 आ गया है",
    "landing.headline.part1": "स्थानीय विचारों को ",
    "landing.headline.part2": "सफल उद्यम में बदलें।",
    "landing.description": "ग्रामीण उद्यमिता के लिए ऑपरेटिंग सिस्टम। हम आपके अगले व्यवसाय को खोजने, मान्य करने और निधि देने में मदद करने के लिए स्वचालित वित्तीय संरचना के साथ हाइपर-लोकल डेटा इंटेलिजेंस को जोड़ते हैं।",
    "landing.cta.start": "अपनी यात्रा शुरू करें",
    "landing.cta.explore": "बाज़ार डेटा एक्सप्लोर करें",
    
    // Trusted By
    "landing.trusted.title": "प्रमुख जमीनी संगठनों द्वारा विश्वसनीय",

    // Bento Grid Features
    "landing.feature1.title": "हाइपर-लोकल मार्केट इंटेलिजेंस",
    "landing.feature1.desc": "हमारे मालिकाना भू-स्थानिक एआई मॉडल का उपयोग करके अपने ब्लॉक के लिए विशिष्ट प्रतिस्पर्धी घनत्व, आपूर्ति श्रृंखला और उपभोक्ता मांग की कल्पना करें।",
    
    "landing.feature2.title": "त्वरित व्यवहार्यता विश्लेषण",
    "landing.feature2.desc": "सेकंड में बैंक-तैयार स्वॉट रिपोर्ट और व्यवहार्यता स्कोर उत्पन्न करें। हम आपके निवेश की रक्षा के लिए स्थानीय संतृप्ति का विश्लेषण करते हैं।",
    
    "landing.feature3.title": "स्वचालित वित्तीय संरचना",
    "landing.feature3.desc": "परियोजना लागत, सब्सिडी पात्रता (PMEGP), और मोहलत अवधि के लिए समायोजित EMI अनुसूची की तुरंत गणना करें।"
  }
};

type DictionaryKeys = keyof typeof dictionary.en;

export function useTranslation() {
  const { language } = useAppStore();

  const t = (key: DictionaryKeys): string => {
    return dictionary[language]?.[key] || dictionary.en[key] || key;
  };

  return { t, language };
}
