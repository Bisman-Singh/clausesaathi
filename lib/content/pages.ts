import type { Locale } from "@/lib/constants";

/**
 * Long-form page copy, kept out of components so the pages stay thin and the
 * two languages sit side by side.
 */

export interface ContentSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export const ABOUT_CONTENT: Record<Locale, ContentSection[]> = {
  en: [
    {
      heading: "What it does",
      paragraphs: [
        "ClauseSaathi reads a contract, notice or policy you paste or upload and explains it in plain language. Every sentence of the explanation points at the clause it came from, so you can check it yourself.",
        "It lists who has to do what and by when, flags clauses worth a second look, spots places where the document contradicts itself, and prepares the questions and documents you would want before meeting a lawyer.",
      ],
    },
    {
      heading: "How generative AI is used",
      paragraphs: [
        "A Gemini model produces the explanation as a structured object that the app validates before showing. The model may only cite clause ids that exist; any citation it invents is dropped and counted on screen.",
        "The model never writes the law. When a risk seems to involve Indian legislation, the app searches the IndiaCode open API and shows the section it returns, with a link to the official text. Deadlines are computed by ordinary date arithmetic from dates you enter, not guessed.",
        "The question and answer panel streams answers grounded in your document and the same statute lookup, and says so when the document does not cover a question.",
      ],
    },
    {
      heading: "What it is not",
      paragraphs: [
        "It is information, not legal advice. It cannot know facts outside the document, it does not know case law, and it can be wrong. For any decision about your rights, speak to a lawyer or your District Legal Services Authority. The legal aid check on the results page tells you whether you may qualify for free help.",
      ],
    },
    {
      heading: "Privacy",
      paragraphs: [
        "Documents are processed in memory for one request and are not stored on the server. The result stays in your browser tab only until you close it.",
        "The model provider sees the document for that one request. The Gemini key runs on Google's paid tier, whose terms say prompts and responses are not used to improve Google's products and are logged only briefly for abuse detection.",
      ],
    },
  ],
  hi: [
    {
      heading: "यह क्या करता है",
      paragraphs: [
        "क्लॉज़साथी आपके चिपकाए या अपलोड किए गए समझौते, नोटिस या नीति को पढ़कर सरल भाषा में समझाता है। समझ का हर वाक्य उस खंड की ओर इशारा करता है जिससे वह आया है, ताकि आप खुद जाँच सकें।",
        "यह बताता है कि किसे क्या और कब तक करना है, ध्यान देने योग्य खंड चिह्नित करता है, जहाँ दस्तावेज़ खुद से टकराता है वह दिखाता है, और वकील से मिलने से पहले के प्रश्न और दस्तावेज़ तैयार करता है।",
      ],
    },
    {
      heading: "जनरेटिव AI का उपयोग कैसे होता है",
      paragraphs: [
        "एक Gemini मॉडल समझ को एक संरचित रूप में देता है जिसे ऐप दिखाने से पहले जाँचता है। मॉडल केवल मौजूद खंड पहचान ही उद्धृत कर सकता है; उसकी गढ़ी हुई कोई भी हवाला हटा दी जाती है और स्क्रीन पर गिनी जाती है।",
        "मॉडल कभी कानून नहीं लिखता। जब कोई जोखिम भारतीय कानून से जुड़ा लगता है, ऐप IndiaCode ओपन API में खोज करता है और लौटाई गई धारा को आधिकारिक पाठ के लिंक के साथ दिखाता है। समय-सीमाएँ आपकी भरी तारीखों से सामान्य तारीख-गणना द्वारा निकलती हैं, अनुमान से नहीं।",
        "प्रश्न-उत्तर पैनल आपके दस्तावेज़ और उसी कानून-खोज पर आधारित उत्तर देता है, और जब दस्तावेज़ किसी प्रश्न को नहीं छूता तो यह साफ़ कह देता है।",
      ],
    },
    {
      heading: "यह क्या नहीं है",
      paragraphs: [
        "यह जानकारी है, कानूनी सलाह नहीं। यह दस्तावेज़ से बाहर के तथ्य नहीं जान सकता, इसे मुकदमों के फैसलों की जानकारी नहीं है, और यह गलत हो सकता है। अपने अधिकारों से जुड़े किसी भी फैसले के लिए वकील या ज़िला विधिक सेवा प्राधिकरण से बात करें। परिणाम पृष्ठ पर विधिक सहायता जाँच बताती है कि आप निःशुल्क सहायता के पात्र हो सकते हैं या नहीं।",
      ],
    },
    {
      heading: "गोपनीयता",
      paragraphs: [
        "दस्तावेज़ एक अनुरोध के लिए मेमोरी में संसाधित होते हैं और सर्वर पर संग्रहीत नहीं होते। परिणाम केवल आपके ब्राउज़र टैब में तब तक रहता है जब तक आप उसे बंद नहीं करते।",
        "मॉडल प्रदाता उस एक अनुरोध के लिए दस्तावेज़ देखता है। Gemini कुंजी Google के सशुल्क स्तर पर चलती है, जिसकी शर्तों के अनुसार प्रॉम्प्ट और उत्तर Google के उत्पाद सुधारने में इस्तेमाल नहीं होते और दुरुपयोग रोकने के लिए केवल थोड़े समय तक लॉग रहते हैं।",
      ],
    },
  ],
};

export const ACCESSIBILITY_CONTENT: Record<Locale, ContentSection[]> = {
  en: [
    {
      heading: "Our commitment",
      paragraphs: [
        "ClauseSaathi is built to meet WCAG 2.2 level AA. Legal information is only accessible if the tool that explains it is, so accessibility is a requirement here, not a feature.",
      ],
    },
    {
      heading: "What is in place",
      paragraphs: [],
      bullets: [
        "Every page works with a keyboard alone, in a logical order, with a visible focus indicator that is never removed.",
        "A skip link is the first tab stop on every page.",
        "All form controls have visible labels; hints and errors are announced with the control.",
        "Colour is never the only carrier of meaning: severity, change type and diff insertions and deletions are also spelled out in text.",
        "Text and background pairs meet 4.5:1 contrast in light and dark schemes.",
        "Progress and results are announced through live regions; focus moves to the results heading when an analysis arrives.",
        "The interface is available in English and Hindi and the page language switches with it, so screen readers use the right voice.",
        "Animations respect the reduce-motion setting.",
        "Layout works from 320px wide and at 200% zoom without horizontal scrolling.",
      ],
    },
    {
      heading: "Known limitations",
      paragraphs: [
        "Scans and photos are transcribed by the model and labelled as such; check the transcription against the original. Statute text opens on IndiaCode, whose accessibility we do not control.",
      ],
    },
    {
      heading: "Feedback",
      paragraphs: [
        "If something is hard to use with assistive technology, open an issue on the source repository linked in the footer.",
      ],
    },
  ],
  hi: [
    {
      heading: "हमारी प्रतिबद्धता",
      paragraphs: [
        "क्लॉज़साथी WCAG 2.2 स्तर AA को पूरा करने के लिए बनाया गया है। कानूनी जानकारी तभी सुलभ है जब उसे समझाने वाला उपकरण सुलभ हो, इसलिए सुगम्यता यहाँ एक आवश्यकता है, सुविधा नहीं।",
      ],
    },
    {
      heading: "क्या मौजूद है",
      paragraphs: [],
      bullets: [
        "हर पृष्ठ केवल कीबोर्ड से, तार्किक क्रम में, हमेशा दिखने वाले फ़ोकस संकेतक के साथ काम करता है।",
        "हर पृष्ठ पर पहला टैब-स्टॉप स्किप लिंक है।",
        "सभी फ़ॉर्म नियंत्रणों के दृश्य लेबल हैं; संकेत और त्रुटियाँ नियंत्रण के साथ घोषित होती हैं।",
        "रंग कभी अर्थ का एकमात्र वाहक नहीं है: गंभीरता, बदलाव का प्रकार और जोड़-हटाव पाठ में भी बताए जाते हैं।",
        "पाठ और पृष्ठभूमि के जोड़े हल्के और गहरे दोनों रूपों में 4.5:1 कंट्रास्ट पूरा करते हैं।",
        "प्रगति और परिणाम लाइव क्षेत्रों से घोषित होते हैं; विश्लेषण आने पर फ़ोकस परिणाम शीर्षक पर जाता है।",
        "इंटरफ़ेस अंग्रेज़ी और हिन्दी में उपलब्ध है और पृष्ठ की भाषा उसके साथ बदलती है, ताकि स्क्रीन रीडर सही आवाज़ चुनें।",
        "एनिमेशन कम-गति सेटिंग का सम्मान करते हैं।",
        "लेआउट 320px चौड़ाई और 200% ज़ूम पर बिना क्षैतिज स्क्रॉल के काम करता है।",
      ],
    },
    {
      heading: "ज्ञात सीमाएँ",
      paragraphs: [
        "स्कैन और फ़ोटो का पाठ मॉडल लिखकर निकालता है और उसे वैसा ही चिह्नित करता है; उसे मूल से मिला लें। कानून का पाठ IndiaCode पर खुलता है, जिसकी सुगम्यता हमारे नियंत्रण में नहीं है।",
      ],
    },
    {
      heading: "प्रतिक्रिया",
      paragraphs: [
        "यदि सहायक तकनीक के साथ कुछ उपयोग करना कठिन है, तो फ़ुटर में दिए स्रोत रिपॉज़िटरी पर एक इश्यू खोलें।",
      ],
    },
  ],
};
