import { FiGlobe } from 'react-icons/fi';

function Header() {
  return (
    <header className="site-header">
      <div className="brand-mark" aria-hidden="true"><FiGlobe /></div>
      <div>
        <h1>GlobeLingo</h1>
        <p>Translate text instantly between languages</p>
      </div>
    </header>
  );
}

export default Header;
