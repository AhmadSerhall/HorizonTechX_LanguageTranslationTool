import { languages } from '../data/languages';

function LanguageSelector({ id, label, value, onChange }) {
  return (
    <div className="language-field">
      <label className="sr-only" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="language-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>{language.name}</option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;
