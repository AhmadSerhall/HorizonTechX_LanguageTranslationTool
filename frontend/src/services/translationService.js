/**
 * API wiring belongs here in the next phase. This intentionally never returns
 * a translation so unfinished integration cannot be mistaken for real output.
 */
export const requestTranslation = async () => {
  throw new Error('Translation service is not connected yet. The backend API will be added in the next phase.');
};
