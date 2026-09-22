import { Routes, Route } from 'react-router-dom';
import { Layout } from '../components/Layout';
import HomePage from '../pages/HomePage';
import OrderPage from '../pages/OrderPage';
import ConfirmPage from '../pages/ConfirmPage';
import PaymentPage from '../pages/PaymentPage';
import TrackingPage from '../pages/TrackingPage';
import ProfilePage from '../pages/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';
import DriverPage from '../pages/DriverPage';
import AccessPage from '../pages/AccessPage';
import SupplierPage from '../pages/SupplierPage';
import SupplierOrderPage from '../pages/SupplierOrderPage';
import DriverOrderPage from '../pages/DriverOrderPage';

export function AppRoutes() {
  return <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/pedir" element={<OrderPage />} />
      <Route path="/confirmar" element={<ConfirmPage />} />
      <Route path="/pagamento" element={<PaymentPage />} />
      <Route path="/rastrear" element={<TrackingPage />} />
      <Route path="/perfil" element={<ProfilePage />} />
      <Route path="/acesso" element={<AccessPage />} />
      <Route path="/driver" element={<DriverPage />} />
      <Route path="/driver/pedido/:orderId" element={<DriverOrderPage />} />
      <Route path="/supplier" element={<SupplierPage />} />
      <Route path="/supplier/pedido/:orderId" element={<SupplierOrderPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
