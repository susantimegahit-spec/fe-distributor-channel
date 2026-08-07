import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import SaltechLogo from 'assets/images/saltech_blue.png';

const SPLASH_EXIT_DELAY = 2400;
const SPLASH_DURATION = 3000;

export default function SplashScreen({ onComplete }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setIsExiting(true), SPLASH_EXIT_DELAY);
    const completeTimer = window.setTimeout(onComplete, SPLASH_DURATION);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`saltech-splash${isExiting ? ' is-exiting' : ''}`}
      role="status"
      aria-label="Memuat halaman login"
    >
      <div className="saltech-splash__aura" aria-hidden="true" />
      <div className="saltech-splash__content">
        <div className="saltech-splash__logo-wrap">
          <img src={SaltechLogo} alt="Saltech — Integrated, Connected, Empowering" />
          <span className="saltech-splash__shine" aria-hidden="true" />
        </div>
        <div className="saltech-splash__loader" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}

SplashScreen.propTypes = {
  onComplete: PropTypes.func.isRequired
};
