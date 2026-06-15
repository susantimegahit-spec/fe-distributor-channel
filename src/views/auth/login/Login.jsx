// project-imoports
import AuthLoginForm from 'sections/auth/AuthLogin';

// assets
// import SusantiMegahLogo from 'assets/images/susanti-megah-logo.svg';
import LogoYellow from 'assets/images/logo-susanti-yellow.png';
import LogoWhite from 'assets/images/logo-susanti-white.png';
import CapKapalLogo from 'assets/images/cap-kapal.png';
import GaramJempol from 'assets/images/garam-jempol.png';
import Garami from 'assets/images/garami.png';
import GaramCapTangan from 'assets/images/garam-cap-tangan.png';
import Garamku from 'assets/images/garamku.png';

// ===========================|| AUTH - LOGIN PAGE ||=========================== //

export default function LoginPage() {
  return (
    <div className="sm-auth-main">
      <div className="sm-auth-shell">
        <section className="sm-auth-brand">
          <div className="sm-auth-brand-inner">
            <img src={LogoWhite} alt="PT. Susanti Megah" className="sm-auth-brand-logo" style={{ width: '100%' }} />
            <div>
              {/* <span className="sm-auth-eyebrow">PT. Susanti Megah</span> */}
              <h1>Distributor Channel</h1>
              <p>Portal distribusi untuk mengelola data pelanggan, sales, item, warehouse, dan pesanan dengan lebih terarah.</p>
            </div>
            <div className='text-center' style={{marginTop: 10}}>
              <div className="md-auth-highlights">
                <img src={CapKapalLogo} style={{ width: '25%' }} />
                <img src={GaramJempol} style={{ width: '25%' }} />
                <img src={Garami} style={{ width: '25%' }} />
              </div>
              <div className="md-auth-highlights">
                <img src={GaramCapTangan} style={{ width: '25%' }} />
                <img src={Garamku} style={{ width: '25%' }} />
              </div>
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
