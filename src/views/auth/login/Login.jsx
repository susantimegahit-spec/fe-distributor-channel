import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

// project-imoports
import AuthLoginForm from 'sections/auth/AuthLogin';
import SplashScreen from './SplashScreen';
import SmestaLogo from 'assets/images/smesta_text_tagline_transparent.png';
import { setDocumentTitle } from '../../../utils/documentTitle';
import { applyThemePreference, getThemePreference } from '../../../utils/themePreference';

// ===========================|| AUTH - LOGIN PAGE ||=========================== //

export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const enforceLightTheme = () => {
      if (root.dataset.pcTheme !== 'light' || root.dataset.bsTheme !== 'light' || root.style.colorScheme !== 'light') {
        applyThemePreference('light');
      }
    };

    enforceLightTheme();

    const themeObserver = new MutationObserver(enforceLightTheme);
    themeObserver.observe(root, { attributes: true, attributeFilter: ['data-pc-theme', 'data-bs-theme', 'style'] });

    return () => {
      themeObserver.disconnect();
      applyThemePreference(getThemePreference());
    };
  }, []);

  useEffect(() => {
    setDocumentTitle({ pathname: '/' });
  }, []);

  return (
    <>
      <div className="sm-auth-main">
        <div className="sm-auth-shell">
          <section className="sm-auth-single-panel">
            <div className="sm-auth-saltech-logo">
              <img src={SmestaLogo} alt="SMESTA" />
            </div>
            <AuthLoginForm />
          </section>
        </div>
      </div>
      {showSplash && <SplashScreen onComplete={hideSplash} />}
    </>
  );
}
