// project-imoports
import AuthLoginForm from 'sections/auth/AuthLogin';

// assets
// import SusantiMegahLogo from 'assets/images/susanti-megah-logo.svg';
import LogoYellow from 'assets/images/logo-susanti-yellow.png';
import LogoWhite from 'assets/images/logo-susanti-white.png';
import CapKapalLogo from 'assets/images/cap-kapal.png';

// ===========================|| AUTH - LOGIN PAGE ||=========================== //

export default function LoginPage() {
  return (
    <div className="sm-auth-main">
      <div className="sm-auth-shell">
        <section className="sm-auth-brand">
          <div className="sm-auth-brand-inner">
            <img src={LogoWhite} alt="PT. Susanti Megah" className="sm-auth-brand-logo" style={{width: "100%"}} />
            <div>
              {/* <span className="sm-auth-eyebrow">PT. Susanti Megah</span> */}
              <h1>Distributor Channel</h1>
              <p>Portal distribusi untuk mengelola data pelanggan, sales, item, warehouse, dan pesanan dengan lebih terarah.</p>
            </div>
            <div className="sm-auth-highlights">
              <img src={CapKapalLogo} style={{width: '20%'}} />
              <img src={CapKapalLogo} style={{width: '20%'}} />
              <img src={CapKapalLogo} style={{width: '20%'}} />
              {/* <div>
                <i className="ti ti-building-store" />
                <span>Distributor</span>
              </div> */}
              {/* <div>
                <i className="ti ti-clipboard-list" />
                <span>Master Item</span>
              </div>
              <div>
                <i className="ti ti-package" />
                <span>Pesanan</span>
              </div> */}
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
