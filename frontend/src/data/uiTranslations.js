const outputPlaceholders = {
  ar: 'ستظهر ترجمتك هنا.',
  de: 'Deine Übersetzung wird hier angezeigt.',
  en: 'Your translation will appear here.',
  es: 'Tu traducción aparecerá aquí.',
  fr: 'Votre traduction apparaîtra ici.',
  it: 'La tua traduzione apparirà qui.',
  ja: '翻訳結果がここに表示されます。',
  ko: '번역 결과가 여기에 표시됩니다.',
  pt: 'Sua tradução aparecerá aqui.',
  ru: 'Ваш перевод появится здесь.',
  tr: 'Çeviriniz burada görünecek.',
  'zh-Hans': '您的翻译将显示在这里。',
  'zh-Hant': '您的翻譯將顯示在這裡。',
};

export const getOutputPlaceholder = (languageCode) => (
  outputPlaceholders[languageCode] || outputPlaceholders.en
);
