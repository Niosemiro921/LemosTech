import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>Gás Expresso · Angola</span>
          <span>Preço, stock e estado do pedido são confirmados pelo servidor.</span><a href="/seguranca-gpl">Segurança GPL</a>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
