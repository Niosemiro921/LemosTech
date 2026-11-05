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
import SupplierDashboardPage from '../pages/SupplierDashboardPage';
import SupplierStockPage from '../pages/SupplierStockPage';
import SupplierOrdersPage from '../pages/SupplierOrdersPage';
import SupplierOrderPage from '../pages/SupplierOrderPage';
import SupplierProductsPage from '../pages/SupplierProductsPage';
import SupplierBottlesPage from '../pages/SupplierBottlesPage';
import SupplierPurchasesPage from '../pages/SupplierPurchasesPage';
import SupplierSuppliersPage from '../pages/SupplierSuppliersPage';
import SupplierDeliveriesPage from '../pages/SupplierDeliveriesPage';
import SupplierInvoicesPage from '../pages/SupplierInvoicesPage';
import SupplierReceivablePage from '../pages/SupplierReceivablePage';
import SupplierPayablePage from '../pages/SupplierPayablePage';
import SupplierExpensesPage from '../pages/SupplierExpensesPage';
import SupplierEmployeesPage from '../pages/SupplierEmployeesPage';
import SupplierBranchesPage from '../pages/SupplierBranchesPage';
import SupplierAuditPage from '../pages/SupplierAuditPage';
import SupplierVendasPage from '../pages/SupplierVendasPage';
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
import AdminWithdrawalPage from '../pages/AdminWithdrawalPage';
import AdminApplicationsPage from '../pages/AdminApplicationsPage';
import AdminEmailPage from '../pages/AdminEmailPage';
import EmpresaProfilePage from '../pages/EmpresaProfilePage';
import SupplierLotsPage from '../pages/SupplierLotsPage';
import SupplierFinancePage from '../pages/SupplierFinancePage';
import SupplierCustomersPage from '../pages/SupplierCustomersPage';
import SupplierInteractionsPage from '../pages/SupplierInteractionsPage';
import SupplierSegmentationPage from '../pages/SupplierSegmentationPage';
import SupplierReportsPage from '../pages/SupplierReportsPage';
import AdminAnalyticsPage from '../pages/AdminAnalyticsPage';
import SupplierProfilePage from '../pages/SupplierProfilePage';
import SupplierBillingPage from '../pages/SupplierBillingPage';
import AdminBillingPage from '../pages/AdminBillingPage';
import SupplierImportPage from '../pages/SupplierImportPage';
import AdminImportPage from '../pages/AdminImportPage';
import OrderChatPage from '../pages/OrderChatPage';


export function AppRoutes() {
  return <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/acesso" element={<AccessPage />} />
      <Route path="/seguranca-gpl" element={<SafetyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registar" element={<Navigate to="/registar/customer" replace />} />
      <Route path="/registar/:role" element={<RegisterPage />} />
      <Route path="/cadastro" element={<Navigate to="/registar/customer" replace />} />
      <Route path="/cadastro/:role" element={<RegisterPage />} />
      <Route path="/cadastrar" element={<Navigate to="/registar/customer" replace />} />
      <Route path="/estado-candidatura" element={<RequireAuth roles={['DRIVER','SUPPLIER','SUPPLIER']} allowPendingProfessional><ApplicationStatusPage /></RequireAuth>} />

      <Route path="/pedir" element={<RequireAuth roles={['CUSTOMER']}><OrderPage /></RequireAuth>} />
      <Route path="/confirmar" element={<RequireAuth roles={['CUSTOMER']}><ConfirmPage /></RequireAuth>} />
      <Route path="/pagamento" element={<RequireAuth roles={['CUSTOMER']}><PaymentPage /></RequireAuth>} />
      <Route path="/rastrear" element={<RequireAuth roles={['CUSTOMER']}><TrackingPage /></RequireAuth>} />
      <Route path="/perfil" element={<RequireAuth roles={['CUSTOMER']}><ProfilePage /></RequireAuth>} />
      <Route path="/enderecos" element={<RequireAuth roles={['CUSTOMER']}><CustomerAddressesPage /></RequireAuth>} />
      <Route path="/notificacoes" element={<RequireAuth roles={['CUSTOMER','DRIVER','SUPPLIER','SUPPLIER','ADMIN']}><NotificationsPage /></RequireAuth>} />
      <Route path="/suporte" element={<RequireAuth roles={['CUSTOMER','DRIVER','SUPPLIER','SUPPLIER','ADMIN']}><SupportPage /></RequireAuth>} />
      <Route path="/chat/pedido/:orderId" element={<RequireAuth roles={['CUSTOMER','DRIVER','SUPPLIER']}><OrderChatPage /></RequireAuth>} />

      <Route path="/driver" element={<RequireAuth roles={['DRIVER']}><DriverPage /></RequireAuth>} />
      <Route path="/driver/pedidos" element={<RequireAuth roles={['DRIVER','SUPPLIER']}><DriverOrdersPage /></RequireAuth>} />
      <Route path="/driver/perfil" element={<RequireAuth roles={['DRIVER','SUPPLIER']}><DriverProfilePage /></RequireAuth>} />
      <Route path="/driver/pedido/:orderId" element={<RequireAuth roles={['DRIVER','SUPPLIER']}><DriverOrderPage /></RequireAuth>} />
      <Route path="/driver/saldo" element={<RequireAuth roles={['DRIVER','SUPPLIER']}><DriverWalletPage /></RequireAuth>} />
      <Route path="/driver/ganhos" element={<RequireAuth roles={['DRIVER','SUPPLIER']}><DriverEarningsPage /></RequireAuth>} />
      <Route path="/driver/documentos" element={<RequireAuth roles={['DRIVER','SUPPLIER']}><DriverDocumentsPage /></RequireAuth>} />
      <Route path="/driver/incidentes" element={<RequireAuth roles={['DRIVER','SUPPLIER']}><DriverIncidentsPage /></RequireAuth>} />

      <Route element={<RequireAuth roles={['SUPPLIER']}><SupplierShell /></RequireAuth>}>
        <Route path="/fornecedor" element={<SupplierDashboardPage />} />
        <Route path="/fornecedor/perfil" element={<SupplierProfilePage />} />
        <Route path="/fornecedor/assinatura" element={<SupplierBillingPage />} />
        <Route path="/fornecedor/stock" element={<SupplierStockPage />} />
        <Route path="/fornecedor/lotes" element={<SupplierLotsPage />} />
        <Route path="/fornecedor/pedidos" element={<SupplierOrdersPage />} />
        <Route path="/fornecedor/pedido/:orderId" element={<SupplierOrderPage />} />
        <Route path="/fornecedor/financeiro" element={<SupplierFinancePage />} />
        <Route path="/fornecedor/botijas" element={<SupplierBottlesPage />} />
        <Route path="/fornecedor/produtos" element={<SupplierProductsPage />} />
        <Route path="/fornecedor/entregas" element={<SupplierDeliveriesPage />} />
        <Route path="/fornecedor/compras" element={<SupplierPurchasesPage />} />
        <Route path="/fornecedor/fornecedores" element={<SupplierSuppliersPage />} />
        <Route path="/fornecedor/faturacao" element={<SupplierInvoicesPage />} />
        <Route path="/fornecedor/receber" element={<SupplierReceivablePage />} />
        <Route path="/fornecedor/pagar" element={<SupplierPayablePage />} />
        <Route path="/fornecedor/despesas" element={<SupplierExpensesPage />} />
        <Route path="/fornecedor/colaboradores" element={<SupplierEmployeesPage />} />
        <Route path="/fornecedor/filiais" element={<SupplierBranchesPage />} />
        <Route path="/fornecedor/auditoria" element={<SupplierAuditPage />} />
        <Route path="/fornecedor/relatorios" element={<SupplierReportsPage />} />
        <Route path="/fornecedor/vendas" element={<SupplierVendasPage />} />
        <Route path="/fornecedor/segmentacao" element={<SupplierSegmentationPage />} />
        <Route path="/fornecedor/interacoes" element={<SupplierInteractionsPage />} />
        <Route path="/fornecedor/clientes" element={<SupplierCustomersPage />} />
        <Route path="/fornecedor/importar" element={<SupplierImportPage />} />
        <Route path="/fornecedor/horarios" element={<CompanySchedulePage />} />
        <Route path="/empresa/perfil" element={<EmpresaProfilePage />} />
        <Route path="/empresa/documentos" element={<CompanyDocumentsPage />} />
        <Route path="/empresa/equipa" element={<CompanyTeamPage />} />
        <Route path="/empresa/horarios" element={<CompanySchedulePage />} />
      </Route>
      <Route path="/supplier" element={<Navigate to="/fornecedor" replace />} />
      <Route path="/supplier/pedido/:orderId" element={<RequireAuth roles={['SUPPLIER']}><SupplierOrderPage /></RequireAuth>} />

      <Route path="/admin" element={<RequireAuth roles={['ADMIN']}><AdminDashboardPage /></RequireAuth>} />
      <Route path="/admin/applications" element={<RequireAuth roles={['ADMIN']}><AdminApplicationsPage /></RequireAuth>} />
      <Route path="/admin/partners" element={<RequireAuth roles={['ADMIN']}><AdminPartnersPage /></RequireAuth>} />
      <Route path="/admin/orders" element={<RequireAuth roles={['ADMIN']}><AdminOrdersPage /></RequireAuth>} />
      <Route path="/admin/dispatch" element={<RequireAuth roles={['ADMIN']}><AdminDispatchPage /></RequireAuth>} />
      <Route path="/admin/audit" element={<RequireAuth roles={['ADMIN']}><AdminAuditPage /></RequireAuth>} />
      <Route path="/admin/wallet/top-ups" element={<RequireAuth roles={['ADMIN']}><AdminWalletTopUpsPage /></RequireAuth>} />
      <Route path="/admin/wallet/withdrawals" element={<RequireAuth roles={['ADMIN']}><AdminWithdrawalPage /></RequireAuth>} />
      <Route path="/admin/email" element={<RequireAuth roles={['ADMIN']}><AdminEmailPage /></RequireAuth>} />
      <Route path="/admin/analytics" element={<RequireAuth roles={['ADMIN']}><AdminAnalyticsPage /></RequireAuth>} />
      <Route path="/admin/billing" element={<RequireAuth roles={['ADMIN']}><AdminBillingPage /></RequireAuth>} />
      <Route path="/admin/importar" element={<RequireAuth roles={['ADMIN']}><AdminImportPage /></RequireAuth>} />

      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
