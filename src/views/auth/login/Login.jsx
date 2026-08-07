import { useCallback, useState } from 'react';

// project-imoports
import AuthLoginForm from 'sections/auth/AuthLogin';
import SplashScreen from './SplashScreen';
import SaltechLogo from 'assets/images/saltech_blue.png';

// ===========================|| AUTH - LOGIN PAGE ||=========================== //

export default function LoginPage() {
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  return (
    <>
      <div className="sm-auth-main">
        <div className="sm-auth-shell">
          <section className="sm-auth-single-panel">
            <div className="sm-auth-saltech-logo">
              <img src={SaltechLogo} alt="Saltech" />
            </div>
            <AuthLoginForm />
          </section>
        </div>
      </div>
      {showSplash && <SplashScreen onComplete={hideSplash} />}
    </>
  );
}
