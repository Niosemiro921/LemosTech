import { Link } from 'react-router-dom';
export default function NotFoundPage(){ return <div className="page narrow-page center-page"><div className="error-code">404</div><h1>Página não encontrada.</h1><p>O endereço que procurou não existe no Gás Expresso.</p><Link className="primary-btn" to="/">Voltar ao início</Link></div>; }
