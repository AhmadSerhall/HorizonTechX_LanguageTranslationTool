const widths = ['100%', '92%', '84%', '96%', '73%', '88%', '62%', '79%'];

const getLineCount = (text) => {
  const lineEstimate = Math.ceil(Math.max(text.trim().length, 1) / 48);
  return Math.min(8, Math.max(1, lineEstimate));
};

const getLineWidth = (index, lineCount) => {
  if (index !== lineCount - 1) return widths[index];
  if (lineCount === 1) return '58%';
  return ['72%', '66%', '76%'][lineCount % 3];
};

function TranslationSkeleton({ sourceText, direction }) {
  const lineCount = getLineCount(sourceText);

  return (
    <div className={`translation-skeleton ${direction === 'rtl' ? 'is-rtl' : ''}`} role="status" aria-label="Translating">
      {Array.from({ length: lineCount }, (_, index) => (
        <span className="translation-skeleton-line" key={index} style={{ width: getLineWidth(index, lineCount) }} />
      ))}
    </div>
  );
}

export default TranslationSkeleton;
