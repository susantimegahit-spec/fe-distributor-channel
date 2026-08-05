// project-imoports
import AuthLoginForm from 'sections/auth/AuthLogin';
import CapKapalLogo from 'assets/images/cap-kapal.png';
import CapLayarLogo from 'assets/images/cap_layar.png';
import GaramCapTanganLogo from 'assets/images/garam-cap-tangan.png';
import GaramiLogo from 'assets/images/garami.png';
import GaramJempolLogo from 'assets/images/garam-jempol.png';
import GaramkuLogo from 'assets/images/garamku.png';
import SaltyImage from 'assets/images/salty2.png';

// ===========================|| AUTH - LOGIN PAGE ||=========================== //

const productLogos = [
  { src: GaramkuLogo, alt: 'Garamku' },
  { src: CapKapalLogo, alt: 'Cap Kapal' },
  { src: CapLayarLogo, alt: 'Cap Layar' },
  { src: GaramiLogo, alt: 'Garami' },
  { src: GaramCapTanganLogo, alt: 'Garam Cap Tangan' },
  { src: GaramJempolLogo, alt: 'Garam Jempol' }
];

export default function LoginPage() {
  return (
    <div className="sm-auth-main">
      <div className="sm-auth-shell">
        <section className="sm-auth-brand">
          <div className="sm-auth-floating-balls sm-auth-floating-salty" aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => (
              <span key={index}>
                <img src={SaltyImage} alt="" />
              </span>
            ))}
          </div>
          <div className="sm-auth-brand-inner">
            <span className="sm-auth-module">
              <i className="ti ti-activity-heartbeat" />
              SM-CONNECT
            </span>
            <div className="sm-auth-copy">
              {/* <h1>
                Distributor <span>operations</span> control room.
              </h1> */}
              <p>
                One secure workspace for Customer Portal, Expedition, Picking List, Production, and Purchasing operations.
              </p>
            </div>
            <div className="sm-auth-products" aria-label="Product brands">
              {productLogos.map((product) => (
                <div className="sm-auth-product" key={product.alt}>
                  <img src={product.src} alt={product.alt} />
                </div>
              ))}
            </div>
            <div className="sm-auth-highlights" aria-label="Dashboard features">
              <div>
                <i className="ti ti-building-store" />
                <span>
                  <strong>Customer Portal</strong>
                  <small>Orders and customer data</small>
                </span>
              </div>
              <div>
                <i className="ti ti-truck-delivery" />
                <span>
                  <strong>Expedition</strong>
                  <small>Routes and shipping rates</small>
                </span>
              </div>
              <div>
                <i className="ti ti-clipboard-list" />
                <span>
                  <strong>Picking List</strong>
                  <small>Warehouse fulfillment</small>
                </span>
              </div>
              <div>
                <i className="ti ti-building-factory-2" />
                <span>
                  <strong>Production</strong>
                  <small>Planning and operations</small>
                </span>
              </div>
              <div>
                <i className="ti ti-shopping-cart" />
                <span>
                  <strong>Purchasing</strong>
                  <small>Orders and suppliers</small>
                </span>
              </div>
            </div>
            {/* <div className="sm-auth-role-pills" aria-label="Available roles">
              {['ADMIN', 'DISTRIBUTOR', 'OM', 'ASM'].map((role) => (
                <div className="sm-auth-role-pill" key={role}>
                  {role}
                </div>
              ))}
            </div> */}
          </div>
        </section>
        <section className="sm-auth-form">
          <AuthLoginForm />
        </section>
      </div>
    </div>
  );
}
