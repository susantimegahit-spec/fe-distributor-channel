// project-imoports
import AuthLoginForm from 'sections/auth/AuthLogin';

// assets
import CustomerPortalWordmark from 'assets/images/customer-portal-wordmark.png';
import CapKapalLogo from 'assets/images/cap-kapal.png';
import GaramJempol from 'assets/images/garam-jempol.png';
import Garami from 'assets/images/garami.png';
import GaramCapTangan from 'assets/images/garam-cap-tangan.png';
import Garamku from 'assets/images/garamku.png';
import CapLayar from 'assets/images/cap_layar.png';

const brandLogos = [
  { src: CapKapalLogo, alt: 'Cap Kapal' },
  { src: GaramJempol, alt: 'Garam Jempol' },
  { src: Garami, alt: 'Garami' },
  { src: GaramCapTangan, alt: 'Garam Cap Tangan' },
  { src: Garamku, alt: 'Garamku' },
  { src: CapLayar, alt: 'Cap Layar' }
];

// ===========================|| AUTH - LOGIN PAGE ||=========================== //

export default function LoginPage() {
  return (
    <div className="sm-auth-main">
      <div className="sm-auth-shell">
        <section className="sm-auth-brand">
          <div className="sm-auth-brand-inner">
            <img src={CustomerPortalWordmark} alt="sm-connect" className="sm-auth-brand-logo" />
            <div>
              {/* <span className="sm-auth-eyebrow">PT. Susanti Megah</span> */}
              <p>A distribution portal to manage customer, sales, item, warehouse, and order data with clearer direction.</p>
            </div>
            <div className="sm-brand-showcase" aria-label="Brand">
              {brandLogos.map((brand) => (
                <div className="sm-brand-logo-tile" key={brand.alt}>
                  <img src={brand.src} alt={brand.alt} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="sm-auth-form">
          <AuthLoginForm />
        </section>
      </div>
    </div>
  );
}
