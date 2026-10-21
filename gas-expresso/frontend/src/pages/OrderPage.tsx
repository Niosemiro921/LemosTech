import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchGasProducts, formatAOA } from '../services/catalog';
import { useOrderStore } from '../stores/orderStore';
import { RealMap } from '../components/RealMap';
import { reverseGeocode, searchAddress, type GeocodingResult } from '../services/geocoding';
import { REQUESTED_VEHICLE_OPTIONS } from '../types/gas';
import { createQuote, type QuotePricingView } from '../services/quote';
import { extractMessage } from '../services/auth';
import { ORDER_KIND_LIST, ORDER_KIND_META, orderKindFromParam } from '../services/orderKinds';
import type { GasProduct } from '../types/gas';

const BOTTLE_BRANDS = [
  { value: 'Sonangol', label: 'Sonangol / Sonagás', tagline: 'Mais comum em Angola', icon: '🟡', popular: true },
  { value: 'Rubis Gás', label: 'Rubis Gás', tagline: 'Rede autorizada', icon: '🔴' },
  { value: 'Galp', label: 'Galp Energia', tagline: 'Distribuição oficial', icon: '🟠' },
  { value: 'TotalEnergies', label: 'TotalEnergies', tagline: 'Qualidade garantida', icon: '🔵' },
  { value: 'Puma Energy', label: 'Puma Energy', tagline: 'Rede nacional', icon: '🟢' },
  { value: 'Outra', label: 'Outra compatível', tagline: 'Padrão do mercado', icon: '⚪' },
];

const VALVE_TYPES = [
  { value: 'QUICK_20MM', label: 'Válvula Rápida 20mm', badge: 'Padrão tradicional', note: 'Encaixe rápido mais comum' },
  { value: 'QUICK_22MM', label: 'Válvula Rápida 22mm', badge: 'Redutor 22mm', note: 'Encaixe rápido largo' },
  { value: 'THREAD_SCREW', label: 'Rosca / Tradicional', badge: 'Enroscar', note: 'Válvula metálica de rosca' },
];

export default function OrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    selectedProduct,
    quantity,
    address,
    deliveryType,
    requestedVehicleType,
    scheduledAt,
    changeForAmount,
    bottleExchangeType,
    bottleBrand,
    valveType,
    deliveryNotes,
    setProduct,
    setQuantity,
    setAddress,
    setDeliveryType,
    setRequestedVehicleType,
    setScheduledAt,
    setChangeForAmount,
    setBottleExchangeType,
    setBottleBrand,
    setValveType,
    setDeliveryNotes,
  } = useOrderStore();

  const kind = bottleExchangeType;
  const kindMeta = ORDER_KIND_META[kind];

  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('Escolha um endereço ou use a sua localização.');
  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [mapResolving, setMapResolving] = useState(false);
  const [products, setProducts] = useState<GasProduct[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [quote, setQuote] = useState<QuotePricingView | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const chosen = products.find((product) => product.id === selectedProduct?.id) ?? products[0] ?? null;

  // Chegou de um atalho (`/pedir?tipo=troca|compra|gas`)? Aplica o tipo escolhido.
  useEffect(() => {
    const fromUrl = orderKindFromParam(searchParams.get('tipo'));
    if (fromUrl && fromUrl !== bottleExchangeType) setBottleExchangeType(fromUrl);
  }, [searchParams, bottleExchangeType, setBottleExchangeType]);

  useEffect(() => {
    let active = true;
    fetchGasProducts().then((items) => {
      if (!active) return;
      setProducts(items);
      if (items.length && !items.some((item) => item.id === selectedProduct?.id)) setProduct(items[0]);
    }).catch((cause: unknown) => {
      if (active) setCatalogError(extractMessage(cause, 'Não foi possível carregar o catálogo.'));
    });
    return () => { active = false; };
  }, [selectedProduct?.id, setProduct]);

  useEffect(() => {
    if (!chosen || !address || address.lat == null || address.lng == null) {
      setQuote(null);
      return;
    }
    let active = true;
    setQuoteLoading(true);
    setQuoteError('');
    createQuote({
      product: chosen,
      quantity,
      deliveryType,
      latitude: address.lat,
      longitude: address.lng,
      deliveryAddress: address.address,
      scheduledAt,
      bottleExchangeType: kind,
      requestedVehicleType,
    }).then((result) => {
      if (!active) return;
      setQuote(result);
      if (!result.available) setQuoteError(result.message ?? 'Sem disponibilidade para este endereço.');
    }).catch((cause: unknown) => {
      if (active) setQuoteError(extractMessage(cause, 'Não foi possível calcular a estimativa.'));
    }).finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [chosen, quantity, deliveryType, requestedVehicleType, address, scheduledAt, kind]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('Este navegador não disponibiliza geolocalização.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('Obtendo sua localização...');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setAddress({
          label: 'Minha localização',
          address: 'Localização atual - coordenadas prontas para o mapa',
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: Math.round(coords.accuracy),
        });
        setLocationStatus('success');
        setLocationMessage(`Localização obtida com precisão aproximada de ${Math.round(coords.accuracy)} m.`);
      },
      () => {
        setLocationStatus('error');
        setLocationMessage('Não foi possível obter a localização. Verifique a permissão do navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const applyGeocodingResult = (result: GeocodingResult) => {
    setAddress({
      label: 'Local de entrega',
      address: result.displayName,
      lat: result.lat,
      lng: result.lng,
      accuracy: undefined,
    });
    setAddressQuery(result.displayName);
    setSearchResults([]);
    setLocationStatus('success');
    setLocationMessage('Ponto de entrega definido. Pode ajustar o pin no mapa.');
  };

  const handleAddressSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (addressQuery.trim().length < 3) {
      setLocationStatus('error');
      setLocationMessage('Digite pelo menos 3 caracteres para pesquisar o endereço.');
      return;
    }

    setSearchingAddress(true);
    setLocationStatus('loading');
    setLocationMessage('Procurando o endereço...');
    try {
      const results = await searchAddress(addressQuery);
      setSearchResults(results);
      setLocationStatus(results.length ? 'success' : 'error');
      setLocationMessage(results.length ? 'Selecione um resultado ou ajuste o pin no mapa.' : 'Não encontramos esse endereço em Angola.');
    } catch {
      setLocationStatus('error');
      setLocationMessage('Não foi possível pesquisar agora. Tente novamente.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleMapChange = async ({ lat, lng }: { lat: number; lng: number }) => {
    setMapResolving(true);
    setLocationStatus('loading');
    setLocationMessage('Identificando o ponto selecionado...');
    try {
      const result = await reverseGeocode(lat, lng);
      setAddress({
        label: 'Ponto selecionado no mapa',
        address: result?.displayName ?? `Coordenadas ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
        accuracy: undefined,
      });
      setAddressQuery(result?.displayName ?? 'Ponto selecionado no mapa');
      setLocationStatus('success');
      setLocationMessage('Ponto de entrega definido. Pode continuar.');
    } catch {
      setAddress({
        label: 'Ponto selecionado no mapa',
        address: `Coordenadas ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        lat,
        lng,
        accuracy: undefined,
      });
      setAddressQuery('Ponto selecionado no mapa');
      setLocationStatus('success');
      setLocationMessage('Ponto de entrega definido. Pode continuar.');
    } finally {
      setMapResolving(false);
    }
  };

  const continueOrder = () => {
    if (!chosen || !products.length) {
      setCatalogError('O catálogo ainda não está disponível.');
      return;
    }
    if (!address) {
      requestLocation();
      return;
    }
    if (deliveryType === 'scheduled' && !scheduledAt) return;
    if (!quote?.available) return;
    navigate('/confirmar');
  };

  const minSchedule = new Date(Date.now() + 60 * 60 * 1000);
  const minScheduleValue = new Date(minSchedule.getTime() - minSchedule.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const deliveryReady = Boolean(address) && (deliveryType !== 'scheduled' || Boolean(scheduledAt));
  const completedSteps = 1 + (chosen ? 1 : 0) + (requestedVehicleType ? 1 : 0) + (deliveryReady ? 1 : 0) + (quote?.available ? 1 : 0);

  return (
    <div className="page order-page">
      <div className="page-heading order-heading">
        <div>
          <span className="section-kicker">Novo pedido · {kindMeta.label}</span>
          <h1>{kindMeta.heading}</h1>
          <p>{kindMeta.subheading}</p>
        </div>
        <div className="order-progress" aria-label="Progresso do pedido">
          {[1, 2, 3, 4, 5].map((step) => (
            <span key={step} className={step <= completedSteps ? 'active' : ''}>{step}</span>
          ))}
        </div>
      </div>

      <div className="order-layout">
        <section className="order-main">
          {/* Step 1: What do you need? */}
          <div className="step-card">
            <div className="step-head">
              <span className="step-number">01</span>
              <div><h2>O que precisa?</h2><p>Escolha o tipo de atendimento — cada um tem o seu preço e passo a passo.</p></div>
            </div>
            <div className="kind-grid">
              {ORDER_KIND_LIST.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`kind-card ${kind === option.value ? 'selected' : ''}`}
                  onClick={() => setBottleExchangeType(option.value)}
                  aria-pressed={kind === option.value}
                >
                  <span className="kind-icon" aria-hidden="true">{option.icon}</span>
                  <strong>{option.label}</strong>
                  <small>{option.tagline}</small>
                  <p>{option.description}</p>
                  <span className="kind-check">{kind === option.value ? '✓ Selecionado' : 'Escolher →'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Choose the cylinder */}
          <div className="step-card">
            <div className="step-head"><span className="step-number">02</span><div><h2>Escolha a botija</h2><p>Selecione o tamanho e a quantidade.</p></div></div>
            {catalogError && <div className="form-error" role="alert">{catalogError}</div>}
            {!products.length && !catalogError && <p role="status">Carregando produtos disponíveis...</p>}
            <div className="product-grid">
              {products.map(product => (
                <button key={product.id} onClick={() => setProduct(product)} className={`product-card ${chosen?.id === product.id ? 'selected' : ''}`} aria-pressed={chosen?.id === product.id}>
                  {product.popular && <span className="popular-badge">Mais pedido</span>}
                  <div className="cylinder">GÁS</div>
                  <strong>{product.label}</strong>
                  <span>{formatAOA(product.price)}</span>
                  {kind === 'NEW_CYLINDER' && <span className="product-extra">+ {formatAOA(product.cylinderPrice)} cilindro</span>}
                  <small>{product.description}</small>
                </button>
              ))}
            </div>

            <div className={`kind-hint ${kind}`}>
              <span aria-hidden="true">{kindMeta.icon}</span>
              <p><strong>{kindMeta.label}:</strong> {kindMeta.note}</p>
            </div>

            <div className="quantity-control">
              <label>
                <strong>Quantidade</strong>
                <small>Máximo de 20 unidades por pedido.</small>
              </label>
              <div className="qty-spinner" aria-label="Quantidade">
                <button onClick={() => setQuantity(quantity - 1)} disabled={quantity === 1} aria-label="Diminuir">−</button>
                <strong>{quantity}</strong>
                <button onClick={() => setQuantity(quantity + 1)} disabled={quantity === 20} aria-label="Aumentar">+</button>
              </div>
            </div>

            {kind !== 'NEW_CYLINDER' && (
              <div className="specs-section">
                <div className="specs-group">
                  <div className="specs-group-head">
                    <span className="specs-kicker">Fornecedora & Marca da Botija</span>
                    <h3>Qual é a marca da sua botija actual?</h3>
                    <p>Selecione a marca do vasilhame que tem para a troca ou recarga.</p>
                  </div>
                  <div className="brand-grid" role="radiogroup" aria-label="Marca da botija">
                    {BOTTLE_BRANDS.map((brand) => (
                      <button
                        key={brand.value}
                        type="button"
                        role="radio"
                        aria-checked={bottleBrand === brand.value}
                        className={`brand-option-card ${bottleBrand === brand.value ? 'selected' : ''}`}
                        onClick={() => setBottleBrand(brand.value)}
                      >
                        <div className="brand-option-head">
                          <span className="brand-icon">{brand.icon}</span>
                          {brand.popular && <span className="brand-popular">Mais comum</span>}
                        </div>
                        <strong>{brand.label}</strong>
                        <small>{brand.tagline}</small>
                        <span className="brand-option-state">
                          {bottleBrand === brand.value ? '✓ Selecionada' : 'Escolher marca'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="specs-group">
                  <div className="specs-group-head">
                    <span className="specs-kicker">Válvula & Redutor</span>
                    <h3>Tipo de encaixe no seu fogão</h3>
                    <p>Escolha o padrão de conexão para assegurar total compatibilidade.</p>
                  </div>
                  <div className="valve-grid" role="radiogroup" aria-label="Tipo de válvula">
                    {VALVE_TYPES.map((valve) => (
                      <button
                        key={valve.value}
                        type="button"
                        role="radio"
                        aria-checked={valveType === valve.value}
                        className={`valve-option-card ${valveType === valve.value ? 'selected' : ''}`}
                        onClick={() => setValveType(valve.value)}
                      >
                        <span className="valve-badge">{valve.badge}</span>
                        <strong>{valve.label}</strong>
                        <small>{valve.note}</small>
                        <span className="valve-state">
                          {valveType === valve.value ? '✓ Selecionada' : 'Escolher válvula'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Preferred delivery vehicle */}
          <div className="step-card vehicle-choice-step">
            <div className="step-head"><span className="step-number">03</span><div><h2>Escolha o veículo de entrega</h2><p>Escolha a opção que prefere. A confirmação depende de um parceiro elegível na sua zona.</p></div></div>
            <div className="vehicle-option-grid" role="radiogroup" aria-label="Veículo de entrega preferido">
              {REQUESTED_VEHICLE_OPTIONS.map((option) => (
                <button key={option.value} type="button" role="radio" aria-checked={requestedVehicleType === option.value} className={`vehicle-option-card ${requestedVehicleType === option.value ? 'selected' : ''}`} onClick={() => setRequestedVehicleType(option.value)}>
                  <span className="vehicle-option-icon" aria-hidden="true">{option.icon}</span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                  <span className="vehicle-option-state">{requestedVehicleType === option.value ? '✓ Selecionado' : 'Escolher veículo'}</span>
                </button>
              ))}
            </div>
            {requestedVehicleType === 'CUPAPATA' && <p className="vehicle-note" role="status">A Cupapata só será confirmada se existir um parceiro com este veículo, capacidade suficiente e disponível para a entrega.</p>}
          </div>

          {/* Step 4: How do you want to receive? */}
          <div className="step-card">
            <div className="step-head"><span className="step-number">04</span><div><h2>Como quer receber?</h2><p>Escolha entre urgência ou planeamento, e prepare o pagamento.</p></div></div>
            <div className="delivery-options">
              <button className={deliveryType === 'express' ? 'option selected' : 'option'} onClick={() => setDeliveryType('express')} aria-pressed={deliveryType === 'express'}>
                <span>⚡ Entrega expressa</span>
                <small>Prioridade - estimativa 20-40 min</small>
              </button>
              <button className={deliveryType === 'scheduled' ? 'option selected' : 'option'} onClick={() => setDeliveryType('scheduled')} aria-pressed={deliveryType === 'scheduled'}>
                <span>📅 Entrega programada</span>
                <small>Horário escolhido pelo cliente</small>
              </button>
            </div>
            {deliveryType === 'scheduled' && (
              <>
                <div className="scheduled-field">
                  <label htmlFor="scheduledAt">Data e hora</label>
                  <input id="scheduledAt" className="input" type="datetime-local" min={minScheduleValue} value={scheduledAt ?? ''} onChange={(event) => setScheduledAt(event.target.value || null)} />
                </div>
                <small className="muted">Horário mínimo: {new Date(minScheduleValue).toLocaleString('pt-AO')}</small>
              </>
            )}

            <div className="payment-chip-row">
              <label>Troco para pagamento na entrega (dinheiro vivo)</label>
              <div className="chip-row">
                {[
                  { label: 'Valor exato / Sem troco', value: null },
                  { label: 'Troco para 5.000 Kz', value: 5000 },
                  { label: 'Troco para 10.000 Kz', value: 10000 },
                  { label: 'Troco para 20.000 Kz', value: 20000 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className={`choice-chip ${changeForAmount === opt.value ? 'selected' : ''}`}
                    aria-pressed={changeForAmount === opt.value}
                    onClick={() => setChangeForAmount(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label>Ponto de referência / Instruções para o entregador</label>
              <textarea
                className="input"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes((e.target as HTMLTextAreaElement).value)}
                placeholder="Ex.: Portão azul, ao lado da padaria, tocar campainha 2"
                rows={2}
              />
            </div>
          </div>

          {/* Step 5: Where to deliver? */}
          <div className="step-card">
            <div className="step-head"><span className="step-number">05</span><div><h2>Onde entregar?</h2><p>O sistema usa esta posição para calcular disponibilidade, distância e rota.</p></div></div>
            <form className="address-search" onSubmit={handleAddressSearch}>
              <div className="address-search-field">
                <span>📍</span>
                <input
                  className="input"
                  value={addressQuery}
                  onChange={(event) => setAddressQuery(event.target.value)}
                  placeholder="Pesquise rua, bairro ou município"
                  aria-label="Pesquisar endereço"
                />
              </div>
              <button className="secondary-btn" type="submit" disabled={searchingAddress}>
                {searchingAddress ? 'Pesquisando...' : 'Pesquisar'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="address-results">
                {searchResults.map((result, index) => (
                  <button key={`${result.lat}-${result.lng}-${index}`} className="address-result" type="button" onClick={() => applyGeocodingResult(result)}>
                    <span className="result-pin">📍</span>
                    <span><strong>{result.displayName}</strong><small>Selecionar este ponto</small></span>
                    <span>→</span>
                  </button>
                ))}
              </div>
            )}

            <button className={`location-picker ${locationStatus}`} onClick={requestLocation} disabled={locationStatus === 'loading' || mapResolving} type="button">
              <span className="location-icon">📍</span>
              <div><strong>{address?.label ?? 'Usar minha localização'}</strong><small>{locationStatus === 'loading' ? 'Identificando localização...' : locationMessage}</small></div>
              <span>{locationStatus === 'success' ? '○' : '+'}</span>
            </button>
            <RealMap compact value={address?.lat != null && address?.lng != null ? { lat: address.lat, lng: address.lng } : null} onChange={handleMapChange} />
            {address && (
              <div className="selected-location-card">
                <span className="location-pin-icon">📍</span>
                <div>
                  <strong>Ponto de entrega selecionado</strong>
                  <small>{address.address}</small>
                </div>
              </div>
            )}

            {address && quoteLoading && (
              <div className="coverage-card loading" role="status">
                <div className="coverage-pulse-ring" />
                <div className="coverage-content">
                  <strong>A validar disponibilidade e fornecedor com o servidor...</strong>
                  <span>A consultar stock em tempo real na rede credenciada</span>
                </div>
              </div>
            )}

            {quote?.available && (
              <div className="coverage-card available">
                <div className="coverage-header">
                  <div className="coverage-badge-group">
                    <span className="coverage-badge">✓ Fornecedor Confirmado</span>
                    <span className="coverage-verified">Empresa Credenciada</span>
                  </div>
                  <span className="live-pill">● Activo na sua zona</span>
                </div>
                <div className="coverage-body">
                  <div className="coverage-icon">🏬</div>
                  <div className="coverage-content">
                    <span className="coverage-kicker">Empresa Fornecedora</span>
                    <h3>{quote.supplier?.tradeName ?? 'Parceiro Local Credenciado'}</h3>
                    <p className="coverage-desc">Stock disponível e garantido para entrega imediata na sua morada.</p>
                    <div className="coverage-meta">
                      {quote.distanceKm != null && (
                        <span className="meta-pill">📍 {quote.distanceKm.toFixed(1)} km de distância</span>
                      )}
                      {quote.estimatedMinutes && (
                        <span className="meta-pill">⏱️ Estimativa: {quote.estimatedMinutes[0]}–{quote.estimatedMinutes[1]} min</span>
                      )}
                      <span className="meta-pill success">✓ Pagamento na entrega</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {quoteError && (
              <div className="coverage-card unavailable" role="alert">
                <div className="coverage-header">
                  <span className="coverage-badge error">! Sem Fornecedor Imediato</span>
                </div>
                <div className="coverage-body">
                  <div className="coverage-icon error">⚠️</div>
                  <div className="coverage-content">
                    <h3>Não foi possível confirmar fornecedor nesta zona</h3>
                    <p>{quoteError}</p>
                    <small>Dica: Ajuste o ponto no mapa para uma via principal de acesso ou experimente outro formato de botija.</small>
                  </div>
                </div>
              </div>
            )}
            <p className="map-help">Disponibilidade, estoque e preço são consultados ao servidor antes da criação do pedido.</p>
          </div>
        </section>

        <aside className="order-summary">
          <div className="summary-top"><span>Resumo do pedido</span><span className="secure">🔒 Seguro</span></div>
          <div className="summary-kind"><span aria-hidden="true">{kindMeta.icon}</span><div><strong>{kindMeta.label}</strong><small>{kindMeta.note}</small></div></div>
          <div className="summary-product"><div className="cylinder small">GÁS</div><div><strong>{chosen ? `${quantity} × ${chosen.label}` : 'Carregando catálogo...'}</strong><small>Preço validado pelo servidor</small></div></div>
          <div className="summary-lines">
            <div><span>Gás</span><strong>{quote?.available ? formatAOA(quote.subtotal) : '−'}</strong></div>
            {quote?.available && quote.cylinderFee > 0 && <div><span>Cilindro novo</span><strong>{formatAOA(quote.cylinderFee)}</strong></div>}
            <div><span>Entrega</span><strong>{quote?.available ? formatAOA(quote.deliveryFee) : '−'}</strong></div>
            <div><span>Comissão Gás Expresso</span><strong>{quote?.available ? formatAOA(quote.platformFee) : '−'}</strong></div>
            {quote?.available && quote.discount > 0 && <div><span>Desconto</span><strong>- {formatAOA(quote.discount)}</strong></div>}
          </div>
          <div className="summary-total"><span>Total estimado</span><strong>{quote?.available ? formatAOA(quote.total) : '−'}</strong></div>
          <button className="primary-btn full" onClick={continueOrder} disabled={locationStatus === 'loading' || quoteLoading || !chosen || (deliveryType === 'scheduled' && !scheduledAt) || Boolean(address && !quote?.available)}>
            {!address ? 'Definir localização' : quoteLoading ? 'Validando disponibilidade...' : quote?.available ? 'Continuar para confirmação' : 'Disponibilidade indisponível'}
            <span>→</span>
          </button>
          <p className="summary-vehicle-note">Veículo preferido: <strong>{REQUESTED_VEHICLE_OPTIONS.find((option) => option.value === requestedVehicleType)?.label ?? 'Motorizada'}</strong></p>
      <p className="summary-note">O preço é calculado pelo servidor e validado novamente ao confirmar. A atribuição do veículo é validada pelo despacho.</p>
        </aside>
      </div>
      <Link to="/" className="back-link">← Voltar para início</Link>
    </div>
  );
}