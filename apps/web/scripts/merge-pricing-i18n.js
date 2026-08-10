const fs = require('fs');
const path = require('path');

const pricingPageEn = {
  badge: 'Flexible plans, powerful growth',
  titleBefore: 'Start small.',
  titleAccent: 'Grow',
  titleAfter: "when you're ready.",
  subtitle:
    'Start free with no card, explore everything for three days, or save with yearly billing.',
  pricesShownIn: 'Prices shown in {{currency}} for {{region}}.',
  perYear: '/ year',
  mostPopular: 'Most Popular',
  saveRibbon: 'Save {{percent}}%',
  bestValueBadge: 'Best Value',
  trialReminder: "We'll remind you before your trial ends.",
  regions: { NP: 'Nepal', US: 'United States', IN: 'India', EU: 'Europe', CN: 'China' },
  plans: {
    free: {
      label: 'Free Plan',
      title: 'Explore Stampz',
      description: 'Start without a bank card and experience the essentials.',
      features: [
        'Create 1 loyalty card',
        'Give 2 stamp transactions',
        'Create 1 customer offer',
        'No bank card required',
      ],
      priceNote: 'Upgrade when you reach a free limit.',
      cta: 'Get Started Free',
      footer: 'No payment details needed.',
    },
    monthly: {
      label: 'Monthly Plan',
      title: 'Try Everything',
      description: 'Unlock every Stampz feature for 3 days, then continue month to month.',
      features: [
        'Full premium access',
        'Unlimited cards, stamps and offers',
        'Explore every feature for 3 days',
        'Cancel anytime',
      ],
      trialPrice: '{{price}} for {{days}} days',
      thenPrice: 'Then {{price}} / month',
      priceNote: 'Billed monthly until cancelled',
      cta: 'Start 3-Day Free Trial',
      footer: 'Bank card required · Automatically renews unless cancelled',
    },
    yearly: {
      label: 'Yearly Plan',
      title: 'Consistent Growth',
      description: 'Build lasting customer habits all year while getting the best value.',
      features: [
        'Full premium access',
        'Unlimited cards, stamps and offers',
        'Long-term customer analytics',
        'Save 33% for the full year',
      ],
      perMonth: '{{price}} per month equivalent.',
      cta: 'Choose Yearly Plan',
      footer: 'One annual payment.',
    },
  },
  trust: {
    secure: { title: 'Secure Payments', body: '100% secure & trusted payment processing' },
    cancel: { title: 'Cancel Anytime', body: 'No long-term contracts. Cancel anytime.' },
    data: { title: 'Your Data is Safe', body: 'We never share your data with third parties.' },
    support: { title: '24/7 Support', body: 'Our team is here to help you anytime.' },
  },
};

const pricingPageNe = {
  ...pricingPageEn,
  badge: 'लचिलो योजना, शक्तिशाली वृद्धि',
  titleBefore: 'सानाबाट सुरु गर्नुहोस्।',
  titleAccent: 'बढ्नुहोस्',
  titleAfter: 'जब तपाईं तयार हुनुहुन्छ।',
  subtitle:
    'कार्डबिना निःशुल्क सुरु गर्नुहोस्, तीन दिन सबै अन्वेषण गर्नुहोस्, वा वार्षिक बिलिङमा बचत गर्नुहोस्।',
  pricesShownIn: '{{region}} का लागि मूल्य {{currency}} मा देखाइएको छ।',
  perYear: '/ वर्ष',
  mostPopular: 'सबैभन्दा लोकप्रिय',
  saveRibbon: '{{percent}}% बचत',
  bestValueBadge: 'उत्कृष्ट मूल्य',
  trialReminder: 'ट्रायल सकिनु अघि हामी सम्झाउनेछौं।',
  regions: { NP: 'नेपाल', US: 'संयुक्त राज्य', IN: 'भारत', EU: 'युरोप', CN: 'चीन' },
  plans: {
    free: {
      label: 'निःशुल्क योजना',
      title: 'Stampz अन्वेषण गर्नुहोस्',
      description: 'बैंक कार्डबिना सुरु गर्नुहोस् र आवश्यक सुविधा अनुभव गर्नुहोस्।',
      features: [
        '१ लोयल्टी कार्ड बनाउनुहोस्',
        '२ स्ट्याम्प लेनदेन दिनुहोस्',
        '१ ग्राहक अफर बनाउनुहोस्',
        'बैंक कार्ड आवश्यक छैन',
      ],
      priceNote: 'निःशुल्क सीमा पुगेपछि अपग्रेड गर्नुहोस्।',
      cta: 'निःशुल्क सुरु गर्नुहोस्',
      footer: 'भुक्तानी विवरण चाहिँदैन।',
    },
    monthly: {
      label: 'मासिक योजना',
      title: 'सबै कुरा प्रयास गर्नुहोस्',
      description:
        '३ दिनका लागि सबै Stampz सुविधा अनलक गर्नुहोस्, त्यसपछि महिना–महिना जारी राख्नुहोस्।',
      features: [
        'पूर्ण प्रिमियम पहुँच',
        'असीमित कार्ड, स्ट्याम्प र अफर',
        '३ दिन सबै सुविधा अन्वेषण',
        'जुनसुकै बेला रद्द',
      ],
      trialPrice: '{{days}} दिनका लागि {{price}}',
      thenPrice: 'त्यसपछि {{price}} / महिना',
      priceNote: 'रद्द नभएसम्म मासिक बिल',
      cta: '३-दिन निःशुल्क ट्रायल सुरु',
      footer: 'बैंक कार्ड आवश्यक · रद्द नगरेसम्म स्वतः नवीकरण',
    },
    yearly: {
      label: 'वार्षिक योजना',
      title: 'निरन्तर वृद्धि',
      description: 'वर्षभरि दिगो ग्राहक बानी बनाउनुहोस् र उत्कृष्ट मूल्य पाउनुहोस्।',
      features: [
        'पूर्ण प्रिमियम पहुँच',
        'असीमित कार्ड, स्ट्याम्प र अफर',
        'दीर्घकालीन ग्राहक एनालिटिक्स',
        'पूरै वर्षका लागि ३३% बचत',
      ],
      perMonth: 'प्रति महिना बराबर {{price}}।',
      cta: 'वार्षिक योजना छान्नुहोस्',
      footer: 'एक वार्षिक भुक्तानी।',
    },
  },
  trust: {
    secure: { title: 'सुरक्षित भुक्तानी', body: '१००% सुरक्षित र भरपर्दो भुक्तानी प्रशोधन' },
    cancel: {
      title: 'जुनसुकै बेला रद्द',
      body: 'लामो अवधिको करार छैन। जुनसुकै बेला रद्द गर्नुहोस्।',
    },
    data: { title: 'तपाईंको डाटा सुरक्षित', body: 'हामी तेस्रो पक्षसँग तपाईंको डाटा साझा गर्दैनौं।' },
    support: { title: '२४/७ समर्थन', body: 'हाम्रो टोली जुनसुकै बेला सहयोगका लागि तयार छ।' },
  },
};

for (const lang of ['ne', 'hi', 'es', 'fr', 'de', 'zh']) {
  const file = path.join('src/locales', lang, 'common.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.login = data.login || 'Login';
  data.blog = data.blog || 'Blog';
  data.resources = data.resources || 'Resources';
  data.pricingPage = lang === 'ne' ? pricingPageNe : pricingPageEn;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('updated', lang);
}
