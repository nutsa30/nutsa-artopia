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

// true, თუ ეს ვიზიტორი საიტს თარგმნილს უყურებს (cookie: googtrans=/ka/en)
export function translationRequested() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/;]*\/([^;]+)/);
    return Boolean(match && match[1] && match[1] !== "ka");
  } catch {
    return false;
  }
}

// ენის შეცვლა: სკრიპტს (საჭიროებისას) ვტვირთავთ და Google-ის ჩამოსაშლელს ვაყენებთ.
export async function changeLanguage(lang) {
  if (lang === "ka" && !loading && !translationRequested()) return; // უკვე ქართულია, სკრიპტი არ გვჭირდება
  await loadGoogleTranslate();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = lang;
      select.dispatchEvent(new Event("change"));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
