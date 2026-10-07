import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RequireAuth } from '../components/RequireAuth';
import { SupplierShell } from '../components/SupplierShell';
import HomePage from '../pages/HomePage';
import OrderPage from '../pages/OrderPage';
import ConfirmPage from '../pages/ConfirmPage';
import PaymentPage from '../pages/PaymentPage';
import TrackingPage from '../pages/TrackingPage';
import ProfilePage from '../pages/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';
import DriverPage from '../pages/DriverPage';
import DriverOrdersPage from '../pages/DriverOrdersPage';
import DriverProfilePage from '../pages/DriverProfilePage';
import AccessPage from '../pages/AccessPage';
import SupplierPage from '../pages/SupplierPage';
import SupplierStockPage from '../pages/SupplierStockPage';
import SupplierOrdersPage from '../pages/SupplierOrdersPage';
import SupplierOrderPage from '../pages/SupplierOrderPage';
import SupplierModulePage from '../pages/SupplierModulePage';
import DriverOrderPage from '../pages/DriverOrderPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ApplicationStatusPage from '../pages/ApplicationStatusPage';
import CustomerAddressesPage from '../pages/CustomerAddressesPage';
import NotificationsPage from '../pages/NotificationsPage';
import SupportPage from '../pages/SupportPage';
import DriverWalletPage from '../pages/DriverWalletPage';
import DriverEarningsPage from '../pages/DriverEarningsPage';
import DriverDocumentsPage from '../pages/DriverDocumentsPage';
import DriverIncidentsPage from '../pages/DriverIncidentsPage';
import CompanyDocumentsPage from '../pages/CompanyDocumentsPage';
import CompanyTeamPage from '../pages/CompanyTeamPage';
import CompanySchedulePage from '../pages/CompanySchedulePage';
import SafetyPage from '../pages/SafetyPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import AdminPartnersPage from '../pages/AdminPartnersPage';
import AdminOrdersPage from '../pages/AdminOrdersPage';
import AdminDispatchPage from '../pages/AdminDispatchPage';
import AdminAuditPage from '../pages/AdminAuditPage';
import AdminWalletTopUpsPage from '../pages/AdminWalletTopUpsPage';

export function AppRoutes() {
  return <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/acesso" element={<AccessPage />} />
      <Route path="/seguranca-gpl" element={<SafetyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registar/:role" element={<RegisterPage />} />
      <Route path="/estado-candidatura" element={<ApplicationStatusPage />} />

      <Route path="/pedir" element={<RequireAuth roles={['CUSTOMER']}><OrderPage /></RequireAuth>} />
      <Route path="/confirmar" element={<RequireAuth roles={['CUSTOMER']}><ConfirmPage /></RequireAuth>} />
      <Route path="/pagamento" element={<RequireAuth roles={['CUSTOMER']}><PaymentPage /></RequireAuth>} />
      <Route path="/rastrear" element={<RequireAuth roles={['CUSTOMER']}><TrackingPage /></RequireAuth>} />
      <Route path="/perfil" element={<RequireAuth roles={['CUSTOMER']}><ProfilePage /></RequireAuth>} />
      <Route path="/enderecos" element={<RequireAuth roles={['CUSTOMER']}><CustomerAddressesPage /></RequireAuth>} />
      <Route path="/notificacoes" element={<RequireAuth roles={['CUSTOMER', 'DRIVER', 'SUPPLIER', 'ADMIN']}><NotificationsPage /></RequireAuth>} />
      <Route path="/suporte" element={<RequireAuth roles={['CUSTOMER', 'DRIVER', 'SUPPLIER', 'ADMIN']}><SupportPage /></RequireAuth>} />

      <Route path="/driver" element={<RequireAuth roles={['DRIVER']}><DriverPage /></RequireAuth>} />
      <Route path="/driver/pedidos" element={<RequireAuth roles={['DRIVER']}><DriverOrdersPage /></RequireAuth>} />
      <Route path="/driver/perfil" element={<RequireAuth roles={['DRIVER']}><DriverProfilePage /></RequireAuth>} />
      <Route path="/driver/pedido/:orderId" element={<RequireAuth roles={['DRIVER']}><DriverOrderPage /></RequireAuth>} />
      <Route path="/driver/saldo" element={<RequireAuth roles={['DRIVER']}><DriverWalletPage /></RequireAuth>} />
      <Route path="/driver/ganhos" element={<RequireAuth roles={['DRIVER']}><DriverEarningsPage /></RequireAuth>} />
      <Route path="/driver/documentos" element={<RequireAuth roles={['DRIVER']}><DriverDocumentsPage /></RequireAuth>} />
      <Route path="/driver/incidentes" element={<RequireAuth roles={['DRIVER']}><DriverIncidentsPage /></RequireAuth>} />

      <Route element={<RequireAuth roles={['SUPPLIER']}><SupplierShell /></RequireAuth>}>
        <Route path="/fornecedor" element={<SupplierPage />} />
        <Route path="/fornecedor/stock" element={<SupplierStockPage />} />
        <Route path="/fornecedor/pedidos" element={<SupplierOrdersPage />} />
        <Route path="/fornecedor/pedido/:orderId" element={<SupplierOrderPage />} />
        <Route path="/fornecedor/lotes" element={<SupplierModulePage module="production-lots" />} />
        <Route path="/fornecedor/financeiro" element={<SupplierModulePage module="finance" />} />
        <Route path="/fornecedor/clientes" element={<SupplierModulePage module="customers" />} />
        <Route path="/fornecedor/interacoes" element={<SupplierModulePage module="interactions" />} />
        <Route path="/fornecedor/segmentacao" element={<SupplierModulePage module="segmentation" />} />
        <Route path="/fornecedor/relatorios" element={<SupplierModulePage module="reports" />} />
        <Route path="/empresa/documentos" element={<CompanyDocumentsPage />} />
        <Route path="/empresa/equipa" element={<CompanyTeamPage />} />
        <Route path="/empresa/horarios" element={<CompanySchedulePage />} />
      </Route>
      <Route path="/supplier" element={<Navigate to="/fornecedor" replace />} />
      <Route path="/supplier/pedido/:orderId" element={<RequireAuth roles={['SUPPLIER']}><SupplierOrderPage /></RequireAuth>} />

      <Route path="/admin" element={<RequireAuth roles={['ADMIN']}><AdminDashboardPage /></RequireAuth>} />
      <Route path="/admin/partners" element={<RequireAuth roles={['ADMIN']}><AdminPartnersPage /></RequireAuth>} />
      <Route path="/admin/orders" element={<RequireAuth roles={['ADMIN']}><AdminOrdersPage /></RequireAuth>} />
      <Route path="/admin/dispatch" element={<RequireAuth roles={['ADMIN']}><AdminDispatchPage /></RequireAuth>} />
      <Route path="/admin/audit" element={<RequireAuth roles={['ADMIN']}><AdminAuditPage /></RequireAuth>} />
      <Route path="/admin/wallet/top-ups" element={<RequireAuth roles={['ADMIN']}><AdminWalletTopUpsPage /></RequireAuth>} />

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
