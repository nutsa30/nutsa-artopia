// One source for /color-lab's title, description and JSON-LD, used by the page
// (src/pages/ColorLabPage.jsx) and the edge function that answers bots
// (netlify/edge-functions/meta.js). No visible text depends on it.
const SITE = 'https://artopia.ge';
const URL = `${SITE}/color-lab`;

export const COLOR_LAB_SEO = {
  url: URL,
  title: 'ფერების შერევა ონლაინ — ფერების ლაბორატორია | Artopia',
  description: 'შეურიე საღებავები და პიგმენტები ონლაინ, ნახე რა ფერი მიიღება და მოსინჯე ტილოზე. სასურველი ფერისთვის მიიღე შერევის რეცეპტი პროცენტებით.',
  image: `${SITE}/images/color-lab/color-lab.jpg`,
  keywords: 'ფერების შერევა, საღებავების შერევა, ფერის მიღება, როგორ მივიღოთ ფერი, ფერების შერევის ცხრილი, ფერების კალკულატორი, ფერის რეცეპტი, პიგმენტების შერევა, ზეთის საღებავი, აკრილის საღებავი, მწვანე ფერის მიღება, ყავისფერის მიღება, იისფერის მიღება, ნარინჯისფერის მიღება, color mixing, paint mixing, color mixer, pigment mixing',
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${URL}#webpage`,
        url: URL,
        name: 'ფერების შერევა ონლაინ — ფერების ლაბორატორია',
        description: 'საღებავებისა და პიგმენტების ონლაინ შერევა, ნარევის მოსინჯვა ტილოზე და სასურველი ფერის რეცეპტი.',
        inLanguage: 'ka-GE',
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': `${URL}#app` },
        primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE}/images/color-lab/color-lab.jpg`, width: 1200, height: 630 },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'მთავარი', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name: 'ფერების ლაბორატორია', item: URL },
          ],
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${URL}#app`,
        name: 'ფერების ლაბორატორია',
        alternateName: ['ფერების შერევა ონლაინ', 'საღებავების შერევის კალკულატორი', 'Color mixing lab', 'Paint mixer'],
        url: URL,
        image: `${SITE}/images/color-lab/color-lab.jpg`,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires a modern browser',
        inLanguage: 'ka-GE',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'GEL' },
        featureList: [
          'საღებავების შერევა სპექტრული მოდელით',
          'შერევის პროპორციები პროცენტებით',
          'ნარევის მოსინჯვა ტილოზე ფუნჯით, ტუბით და პალიტრის დანით',
          'სასურველი ფერის შერევის რეცეპტი',
          'შესაბამისი ან მსგავსი საღებავები Artopia-ს კატალოგში',
        ],
        provider: { '@id': `${SITE}/#organization` },
      },
    ],
  },
};
