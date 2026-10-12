// Google Translate იტვირთება მხოლოდ მაშინ, როცა ნამდვილად სჭირდება ვინმეს:
// ენის გადამრთველზე დაჭერისას, ან თუ მომხმარებელმა წინა ვიზიტზე ინგლისური
// აირჩია (Google ამას `googtrans` cookie-ში ინახავს). ადრე სკრიპტი ყველა
// გვერდის რენდერს ~1 წამით აყოვნებდა ყველა ვიზიტორისთვის.

const SCRIPT = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
let loading = null;

export function loadGoogleTranslate() {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          { pageLanguage: "ka", includedLanguages: "en,ka" },
          "google_translate_element"
        );
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onerror = () => {
      loading = null; // შემდეგ დაჭერაზე თავიდან ვცადოთ
      reject(new Error("Google Translate ვერ ჩაიტვირთა"));
    };
    document.body.appendChild(script);
  });
  return loading;
}

// რომელ ენაზე უყურებს ვიზიტორი საიტს ახლა: Google ამას `googtrans` cookie-ში
// ინახავს (/ka/en = ინგლისურად; cookie არ არის ან /ka/ka = ქართულად).
function currentLanguage() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/;]*\/([^;]+)/);
    return match && match[1] ? match[1] : "ka";
  } catch {
    return "ka";
  }
}

// true, თუ ეს ვიზიტორი საიტს თარგმნილს უყურებს
export function translationRequested() {
  return currentLanguage() !== "ka";
}

// ენის შეცვლა: სკრიპტს (საჭიროებისას) ვტვირთავთ და Google-ის ჩამოსაშლელს ვაყენებთ.
// ჩამოსაშლელი DOM-ში ჩნდება ცოტა უფრო ადრე, ვიდრე Google მის მოვლენას მოუსმენს,
// ამიტომ ცვლილებას ვიმეორებთ, სანამ არჩეული ენა რეალურად არ ამოქმედდება.
export async function changeLanguage(lang) {
  if (currentLanguage() === lang && (lang === "ka" || loading)) return; // უკვე ამ ენაზეა
  await loadGoogleTranslate();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const select = document.querySelector(".goog-te-combo");
    if (select && select.options.length > 0) {
      select.value = lang;
      select.dispatchEvent(new Event("change"));
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (currentLanguage() === lang) return;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}
