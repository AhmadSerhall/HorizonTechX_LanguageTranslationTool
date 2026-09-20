import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { getLanguage, languages } from '../data/languages';

function LanguageSelector({ id, label, value, onChange, selectorType }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);
  const pickerRef = useRef(null);
  const isSource = selectorType === 'source';
  const selectedLanguage = value === 'auto' ? { code: 'auto', name: 'Detect language' } : getLanguage(value);
  const languageOptions = useMemo(() => (
    isSource ? [{ code: 'auto', name: 'Detect language' }, ...languages] : languages
  ), [isSource]);
  const filteredLanguages = languageOptions.filter((language) => (
    [language.name, language.nativeName, language.code].filter(Boolean).some((item) => (
      item.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
    ))
  ));

  const closePicker = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    searchInputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closePicker();
    };
    const handlePointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) closePicker();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [closePicker, isOpen]);

  const selectLanguage = (languageCode) => {
    onChange(languageCode);
    closePicker();
  };

  return (
    <div className="language-picker" ref={pickerRef}>
      <button
        id={id}
        className="language-picker-trigger"
        type="button"
        aria-label={`${label}: ${selectedLanguage?.name || 'Select language'}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        <span>{selectedLanguage?.name || 'Select language'}</span>
        <FiChevronDown aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="language-picker-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePicker();
        }}>
          <section className="language-picker-panel" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
            <div className="language-picker-search">
              <FiSearch aria-hidden="true" />
              <label className="sr-only" htmlFor={`${id}-search`}>{isSource ? 'Translate from' : 'Translate to'}</label>
              <input
                ref={searchInputRef}
                id={`${id}-search`}
                type="search"
                value={query}
                placeholder={isSource ? 'Translate from' : 'Translate to'}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button className="icon-button language-picker-close" type="button" aria-label="Close language selector" onClick={closePicker}>
                <FiX />
              </button>
            </div>
            <h2 id={`${id}-title`} className="sr-only">Choose {label.toLocaleLowerCase()}</h2>
            <div className="language-options" aria-label={label}>
              {filteredLanguages.map((language) => (
                <button
                  className={`language-option ${language.code === value ? 'is-selected' : ''}`}
                  key={language.code}
                  type="button"
                  onClick={() => selectLanguage(language.code)}
                >
                  <span>{language.name}</span>
                  {language.nativeName && <small>{language.nativeName}</small>}
                </button>
              ))}
              {!filteredLanguages.length && <p className="no-language-results">No languages found</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
