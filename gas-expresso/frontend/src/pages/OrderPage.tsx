import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchGasProducts, formatAOA } from '../services/catalog';
import { useOrderStore } from '../stores/orderStore';
import { RealMap } from '../components/RealMap';
import { reverseGeocode, searchAddress, type GeocodingResult } from '../services/geocoding';
import type { GasProduct } from '../types/gas';
import { createQuote, type QuotePricingView } from '../services/quote';
import { extractMessage } from '../services/auth';
import { ORDER_KIND_LIST, ORDER_KIND_META, orderKindFromParam } from '../services/orderKinds';

type OrderStep = 1 | 2 | 3;

const CASH_CHANGE_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Sem troco', value: null },
  { label: '5 000 Kz', value: 5000 },
  { label: '10 000 Kz', value: 10000 },
  { label: '20 000 Kz', value: 20000 },
];

export default function OrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    selectedProduct,
    quantity,
    address,
    deliveryType,
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
    setScheduledAt,
    setChangeForAmount,
    setBottleExchangeType,
    setBottleBrand,
    setValveType,
    setDeliveryNotes,
  } = useOrderStore();

  const kind = bottleExchangeType;
  const kindMeta = ORDER_KIND_META[kind];
  const [currentStep, setCurrentStep] = useState<OrderStep>(1);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('Pesquise o endereço ou escolha o ponto exacto no mapa.');
  const [addressQuery, setAddressQuery] = useState(address?.address ?? '');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [mapResolving, setMapResolving] = useState(false);
  const [products, setProducts] = useState<GasProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [quote, setQuote] = useState<QuotePricingView | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteRefreshKey, setQuoteRefreshKey] = useState(0);
  const chosen = products.find((product) => product.id === selectedProduct?.id) ?? null;

  useEffect(() => {
    const fromUrl = orderKindFromParam(searchParams.get('tipo'));
    if (fromUrl && fromUrl !== bottleExchangeType) setBottleExchangeType(fromUrl);
  }, [searchParams, bottleExchangeType, setBottleExchangeType]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError('');
    fetchGasProducts().then((items) => {
      if (!active) return;
      setProducts(items);
      if (items.length && !items.some((item) => item.id === selectedProduct?.id)) setProduct(items[0]);
      if (!items.length) setCatalogError('Neste momento não existem produtos disponíveis no catálogo. Tente novamente mais tarde.');
    }).catch((cause: unknown) => {
      if (active) setCatalogError(extractMessage(cause, 'Não foi possível carregar os produtos. Verifique a ligação e tente novamente.'));
    }).finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
    // O catálogo deve ser carregado uma vez ao abrir o fluxo; setProduct tem identidade estável no Zustand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProduct]);

  useEffect(() => {
    if (!chosen || !address || address.lat == null || address.lng == null) {
      setQuote(null);
      setQuoteError('');
      setQuoteLoading(false);
      return;
    }

    let active = true;
    setQuote(null);
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
    }).then((result) => {
      if (!active) return;
      setQuote(result);
      if (!result.available) setQuoteError(result.message ?? 'Ainda não há disponibilidade confirmada para este endereço.');
    }).catch((cause: unknown) => {
      if (active) setQuoteError(extractMessage(cause, 'Não foi possível calcular o preço e a disponibilidade. Tente novamente.'));
    }).finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [chosen, quantity, deliveryType, address, scheduledAt, kind, quoteRefreshKey]);

  const applyAddress = (lat: number, lng: number, label: string, accuracy?: number) => {
    setAddress({ label, address: label, lat, lng, accuracy });
    setAddressQuery(label);
    setSearchResults([]);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('Este navegador não disponibiliza localização. Pesquise o bairro/rua ou escolha o ponto manualmente no mapa.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('A obter a sua localização…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void (async () => {
          const accuracy = Math.round(coords.accuracy);
          try {
            const result = await reverseGeocode(coords.latitude, coords.longitude);
            const label = result?.displayName ?? `Ponto GPS (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`;
            setAddress({ label: 'Minha localização', address: label, lat: coords.latitude, lng: coords.longitude, accuracy });
            setAddressQuery(label);
            setLocationStatus('success');
            setLocationMessage(`Localização obtida com precisão aproximada de ${accuracy} m. Confirme o ponto no mapa.`);
          } catch {
            const label = `Ponto GPS (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`;
            setAddress({ label: 'Minha localização', address: label, lat: coords.latitude, lng: coords.longitude, accuracy });
            setAddressQuery(label);
            setLocationStatus('success');
            setLocationMessage(`GPS obtido com precisão aproximada de ${accuracy} m. Pode ajustar o ponto no mapa.`);
          }
        })();
      },
      (error) => {
        setLocationStatus('error');
        const message = error.code === error.PERMISSION_DENIED
          ? 'A permissão de localização foi recusada. Pesquise o endereço ou seleccione manualmente no mapa.'
          : error.code === error.TIMEOUT
            ? 'A localização demorou demasiado. Tente novamente ou escolha o ponto no mapa.'
            : 'Não foi possível obter a localização. Pesquise o endereço ou escolha o ponto no mapa.';
        setLocationMessage(message);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  };

  const applyGeocodingResult = (result: GeocodingResult) => {
    setAddress({ label: 'Local de entrega', address: result.displayName, lat: result.lat, lng: result.lng });
    setAddressQuery(result.displayName);
    setSearchResults([]);
    setLocationStatus('success');
    setLocationMessage('Ponto escolhido. Confirme a localização no mapa antes de continuar.');
  };

  const handleAddressSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addressQuery.trim().length < 3) {
      setLocationStatus('error');
      setLocationMessage('Introduza pelo menos 3 caracteres para pesquisar.');
      return;
    }
    setSearchingAddress(true);
    setLocationStatus('loading');
    setLocationMessage('A pesquisar endereços em Angola…');
    setSearchResults([]);
    try {
      const results = await searchAddress(addressQuery);
      setSearchResults(results);
      setLocationStatus(results.length ? 'success' : 'error');
      setLocationMessage(results.length ? 'Escolha o resultado que corresponde à entrega.' : 'Não encontrámos resultados. Experimente bairro, município ou um ponto de referência.');
    } catch {
      setLocationStatus('error');
      setLocationMessage('A pesquisa de endereços está temporariamente indisponível. Pode seleccionar o ponto directamente no mapa.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleMapChange = async ({ lat, lng }: { lat: number; lng: number }) => {
    setMapResolving(true);
    setLocationStatus('loading');
    setLocationMessage('A identificar o local seleccionado…');
    try {
      const result = await reverseGeocode(lat, lng);
      const label = result?.displayName ?? `Coordenadas ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      applyAddress(lat, lng, label);
      setLocationStatus('success');
      setLocationMessage('Ponto definido. Acrescente uma referência que ajude o profissional a encontrar a entrada.');
    } catch {
      const label = `Coordenadas ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      applyAddress(lat, lng, label);
      setLocationStatus('success');
      setLocationMessage('Ponto definido pelas coordenadas. Acrescente uma referência para facilitar a chegada.');
    } finally {
      setMapResolving(false);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const goToStep = (step: OrderStep) => { setCurrentStep(step); scrollToTop(); };

  const continueOrder = () => {
    if (currentStep === 1) {
      if (catalogLoading) return;
      if (!chosen || !products.length) {
        setCatalogError(catalogError || 'Seleccione um produto disponível para continuar.');
        return;
      }
      goToStep(2);
      return;
    }
    if (currentStep === 2) {
      if (deliveryType === 'scheduled' && !scheduledAt) {
        setQuoteError('Escolha a data e a hora pretendidas para a entrega.');
        return;
      }
      setQuoteError('');
      goToStep(3);
      return;
    }
    if (deliveryType === 'scheduled' && !scheduledAt) {
      setQuoteError('Escolha a data e a hora pretendidas para a entrega.');
      goToStep(2);
      return;
    }
    if (!chosen) {
      goToStep(1);
      return;
    }
    if (!address || address.lat == null || address.lng == null) {
      requestLocation();
      return;
    }
    if (!quoteLoading && quote?.available) navigate('/confirmar');
  };

  const minSchedule = new Date(Date.now() + 60 * 60 * 1000);
  const minScheduleValue = new Date(minSchedule.getTime() - minSchedule.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const stepLabels = ['Produto', 'Entrega', 'Localização'];
  const canContinue = currentStep === 1
    ? Boolean(chosen && products.length && !catalogLoading)
    : currentStep === 2
      ? deliveryType !== 'scheduled' || Boolean(scheduledAt)
      : Boolean(address?.lat != null && address?.lng != null && quote?.available && !quoteLoading);

  return (
    <div className="page order-page order-page-v2">
      <header className="order-flow-header">
        <div className="order-flow-title">
          <Link to="/" className="order-back-link">← Voltar</Link>
          <span className="section-kicker">Gás Expresso · Novo pedido</span>
          <h1>Pedir gás <span>sem complicações.</span></h1>
          <p>Escolha o produto, indique como quer receber e marque o ponto exacto no mapa.</p>
        </div>
        <div className="order-trust-chip"><span aria-hidden="true">✓</span><div><strong>Preço confirmado pela API</strong><small>Sem estimativas inventadas</small></div></div>
      </header>

      <nav className="order-stepper" aria-label="Etapas do pedido">
        {stepLabels.map((label, index) => {
          const step = (index + 1) as OrderStep;
          const isDone = step < currentStep;
          return (
            <button key={label} type="button" className={`order-stepper-item ${step === currentStep ? 'current' : ''} ${isDone ? 'done' : ''}`} onClick={() => step <= currentStep && goToStep(step)} disabled={step > currentStep} aria-current={step === currentStep ? 'step' : undefined}>
              <span className="order-stepper-number">{isDone ? '✓' : `0${step}`}</span>
              <span className="order-stepper-copy"><strong>{label}</strong><small>{step === 1 ? 'O que precisa' : step === 2 ? 'Quando e como' : 'Onde entregar'}</small></span>
            </button>
          );
        })}
      </nav>

      <div className="order-layout order-layout-v2">
        <section className="order-main order-main-v2" aria-live="polite">
          {currentStep === 1 && (
            <div className="step-card order-step-panel">
              <div className="order-step-panel-head">
                <div className="order-step-heading"><span className="step-number">01</span><div><span className="order-overline">Produto e serviço</span><h2>O que precisa hoje?</h2><p>Escolha a operação e a botija. Os produtos e preços são carregados do catálogo.</p></div></div>
              </div>

              <div className="order-field-section">
                <div className="order-section-label"><span>Tipo de atendimento</span><small>Seleccione uma opção</small></div>
                <div className="kind-grid order-kind-grid">
                  {ORDER_KIND_LIST.map((option) => (
                    <button key={option.value} type="button" className={`kind-card ${kind === option.value ? 'selected' : ''}`} onClick={() => setBottleExchangeType(option.value)} aria-pressed={kind === option.value}>
                      <span className="kind-icon" aria-hidden="true">{option.icon}</span>
                      <span className="order-option-check" aria-hidden="true">{kind === option.value ? '✓' : '+'}</span>
                      <strong>{option.label}</strong><small>{option.tagline}</small><p>{option.description}</p>
                    </button>
                  ))}
                </div>
                <div className={`kind-hint ${kind}`}><span aria-hidden="true">ⓘ</span><p><strong>{kindMeta.label}:</strong> {kindMeta.note}</p></div>
              </div>

              <div className="order-field-section">
                <div className="order-section-label"><span>Escolha a botija</span><small>{products.length ? `${products.length} opção(ões) do catálogo` : 'Catálogo de produtos'}</small></div>
                {catalogLoading && <div className="order-state-card" role="status"><span className="order-state-spinner"/><div><strong>A carregar produtos</strong><p>Estamos a consultar o catálogo disponível.</p></div></div>}
                {!catalogLoading && catalogError && <div className="order-state-card error" role="alert"><span>!</span><div><strong>Não foi possível carregar o catálogo</strong><p>{catalogError}</p><button type="button" className="text-action" onClick={() => { setCatalogError(''); setCatalogLoading(true); fetchGasProducts().then((items) => { setProducts(items); if (items.length && !items.some((item) => item.id === selectedProduct?.id)) setProduct(items[0]); if (!items.length) setCatalogError('Não existem produtos disponíveis neste momento.'); }).catch((cause: unknown) => setCatalogError(extractMessage(cause, 'Falha ao consultar o catálogo.'))).finally(() => setCatalogLoading(false)); }}>Tentar novamente</button></div></div>}
                {!catalogLoading && !catalogError && products.length > 0 && (
                  <div className="product-grid order-product-grid">
                    {products.map((product) => (
                      <button key={product.id} type="button" onClick={() => setProduct(product)} className={`product-card order-product-card ${chosen?.id === product.id ? 'selected' : ''}`} aria-pressed={chosen?.id === product.id}>
                        <span className="order-product-check" aria-hidden="true">{chosen?.id === product.id ? '✓' : ''}</span>
                        <span className="order-product-visual" aria-hidden="true"><span className="order-cylinder-cap"/><span className="order-cylinder-body"><small>GPL</small></span></span>
                        <span className="order-product-size">{product.size}</span>
                        <strong>{product.label}</strong>
                        <span className="order-product-price">{formatAOA(product.price)}<small> / unidade</small></span>
                        {kind === 'NEW_CYLINDER' && product.cylinderPrice > 0 && <span className="product-extra">Cilindro: {formatAOA(product.cylinderPrice)}</span>}
                        <small className="order-product-description">{product.description}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="quantity-control order-quantity-control">
                <div><strong>Quantidade</strong><small>Até 20 unidades por pedido.</small></div>
                <div className="qty-spinner"><button type="button" onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Diminuir quantidade">−</button><output aria-live="polite">{quantity}</output><button type="button" onClick={() => setQuantity(quantity + 1)} disabled={quantity >= 20} aria-label="Aumentar quantidade">+</button></div>
              </div>

              {kind !== 'NEW_CYLINDER' && (
                <div className="order-product-details">
                  <div className="form-field"><label htmlFor="bottleBrand">Marca da botija</label><select id="bottleBrand" className="input" value={bottleBrand} onChange={(event) => setBottleBrand(event.target.value)}><option value="Sonangol">Sonangol / Sonagás</option><option value="Rubis Gás">Rubis Gás</option><option value="Galp">Galp Energia</option><option value="TotalEnergies">TotalEnergies</option><option value="Puma Energy">Puma Energy</option><option value="Outra">Outra marca compatível</option></select></div>
                  <div className="form-field"><label htmlFor="valveType">Válvula / redutor</label><select id="valveType" className="input" value={valveType} onChange={(event) => setValveType(event.target.value)}><option value="QUICK_20MM">Válvula rápida 20 mm</option><option value="QUICK_22MM">Válvula rápida 22 mm</option><option value="THREAD_SCREW">Rosca / tradicional</option></select></div>
                </div>
              )}

              <div className="order-step-actions"><span className="order-action-hint">Pode rever os detalhes antes de confirmar.</span><button className="primary-btn order-next-btn" type="button" onClick={continueOrder} disabled={!canContinue}>Continuar <span>→</span></button></div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-card order-step-panel">
              <div className="order-step-heading"><span className="step-number">02</span><div><span className="order-overline">Entrega e pagamento</span><h2>Como quer receber?</h2><p>Escolha a urgência, deixe instruções úteis e indique se precisa de troco.</p></div></div>

              <div className="order-field-section">
                <div className="order-section-label"><span>Quando entregar</span><small>Disponibilidade confirmada no próximo passo</small></div>
                <div className="delivery-options order-delivery-options">
                  <button type="button" className={`option order-delivery-option ${deliveryType === 'express' ? 'selected' : ''}`} onClick={() => setDeliveryType('express')} aria-pressed={deliveryType === 'express'}><span className="order-delivery-icon">⚡</span><span className="order-delivery-copy"><strong>Entrega expressa</strong><small>Assim que houver disponibilidade e profissional atribuído.</small></span><span className="order-radio"/></button>
                  <button type="button" className={`option order-delivery-option ${deliveryType === 'scheduled' ? 'selected' : ''}`} onClick={() => setDeliveryType('scheduled')} aria-pressed={deliveryType === 'scheduled'}><span className="order-delivery-icon">▦</span><span className="order-delivery-copy"><strong>Entrega programada</strong><small>Escolha a data e hora pretendidas.</small></span><span className="order-radio"/></button>
                </div>
                {deliveryType === 'scheduled' && <div className="scheduled-field order-scheduled-field"><label htmlFor="scheduledAt">Data e hora pretendidas</label><input id="scheduledAt" className="input" type="datetime-local" min={minScheduleValue} value={scheduledAt ?? ''} onChange={(event) => setScheduledAt(event.target.value || null)}/><small>Escolha uma hora pelo menos uma hora à frente. A confirmação depende da disponibilidade da empresa.</small>{!scheduledAt && <span className="order-inline-validation">Seleccione a data e a hora para continuar.</span>}</div>}
              </div>

              <div className="order-field-section">
                <div className="order-section-label"><span>Pagamento na entrega</span><small>Dinheiro físico</small></div>
                <div className="order-payment-info"><span aria-hidden="true">Kz</span><div><strong>Pagamento em Kwanza</strong><small>O total final será validado pelo servidor antes de criar o pedido.</small></div></div>
                <div className="payment-chip-row order-change-row"><label>Precisa de troco para quanto?</label><div className="chip-row">{CASH_CHANGE_OPTIONS.map((option) => <button key={option.label} type="button" className={`choice-chip ${changeForAmount === option.value ? 'selected' : ''}`} aria-pressed={changeForAmount === option.value} onClick={() => setChangeForAmount(option.value)}>{option.label}</button>)}</div></div>
              </div>

              <div className="order-field-section">
                <div className="order-section-label"><span>Referências de entrega</span><small>Opcional, mas recomendado</small></div>
                <div className="form-field"><label htmlFor="deliveryNotes">Como encontrar a sua casa?</label><textarea id="deliveryNotes" className="input order-notes-input" value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} placeholder="Ex.: portão cinzento, entrada ao lado da farmácia, ligar quando chegar…" rows={3}/><small className="order-field-help">Não coloque palavras-passe nem dados de pagamento nestas instruções.</small></div>
              </div>

              {quoteError && deliveryType === 'scheduled' && !scheduledAt && <p className="form-error" role="alert">{quoteError}</p>}
              <div className="order-step-actions"><button className="secondary-btn" type="button" onClick={() => goToStep(1)}>← Voltar</button><button className="primary-btn order-next-btn" type="button" onClick={continueOrder} disabled={!canContinue}>Indicar localização <span>→</span></button></div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-card order-step-panel order-location-step">
              <div className="order-step-heading"><span className="step-number">03</span><div><span className="order-overline">Ponto de entrega</span><h2>Onde devemos chegar?</h2><p>Escolha um endereço e confirme o ponto exacto no mapa. A posição será usada para validar cobertura e cotar a entrega.</p></div></div>

              <form className="address-search order-address-search" onSubmit={handleAddressSearch}>
                <div className="address-search-field"><span aria-hidden="true">⌕</span><input className="input" value={addressQuery} onChange={(event) => { setAddressQuery(event.target.value); setSearchResults([]); }} placeholder="Pesquise bairro, rua, município ou referência" aria-label="Pesquisar endereço"/></div>
                <button className="secondary-btn" type="submit" disabled={searchingAddress || addressQuery.trim().length < 3}>{searchingAddress ? 'A pesquisar…' : 'Pesquisar'}</button>
              </form>

              {searchResults.length > 0 && <div className="address-results order-address-results" role="listbox" aria-label="Resultados de endereço">{searchResults.map((result, index) => <button key={`${result.lat}-${result.lng}-${index}`} className="address-result" type="button" role="option" aria-selected={false} onClick={() => applyGeocodingResult(result)}><span className="result-pin">⌖</span><span><strong>{result.displayName}</strong><small>Usar este ponto de entrega</small></span><span aria-hidden="true">→</span></button>)}</div>}

              <button className={`location-picker order-gps-button ${locationStatus}`} onClick={requestLocation} disabled={locationStatus === 'loading' || mapResolving} type="button"><span className="location-icon">⌖</span><span className="order-gps-copy"><strong>Usar a minha localização</strong><small>{locationStatus === 'loading' ? 'A obter / identificar a localização…' : 'Permita o GPS para colocar o pin no local onde está.'}</small></span><span className="order-gps-action">Usar GPS</span></button>
              <div className="order-location-status" data-state={locationStatus} role={locationStatus === 'error' ? 'alert' : 'status'}><span aria-hidden="true">{locationStatus === 'success' ? '✓' : locationStatus === 'error' ? '!' : 'i'}</span><p>{mapResolving ? 'A identificar o ponto seleccionado…' : locationMessage}</p></div>

              <div className="order-map-heading"><div><strong>Confirme no mapa</strong><small>Toque no mapa para ajustar o pin. O mapa mostra ruas reais.</small></div><span className={address?.lat != null && address?.lng != null ? 'order-pin-status ready' : 'order-pin-status'}>{address?.lat != null && address?.lng != null ? 'Ponto definido' : 'A aguardar ponto'}</span></div>
              <div className="order-map-frame"><RealMap compact value={address?.lat != null && address?.lng != null ? { lat: address.lat, lng: address.lng } : null} onChange={handleMapChange} markerLabel="Entrega"/></div>
              {address && address.lat != null && address.lng != null && <div className="selected-location-card order-selected-location"><span>✓</span><div><strong>{address.label || 'Local de entrega'}</strong><small>{address.address}</small><small className="order-coordinates">{address.lat.toFixed(5)}, {address.lng.toFixed(5)}{address.accuracy ? ` · precisão GPS ~${address.accuracy} m` : ''}</small></div><button type="button" className="text-action" onClick={() => { setAddressQuery(''); setAddress(null); setQuote(null); setQuoteError(''); setLocationStatus('idle'); setLocationMessage('Pesquise um endereço ou escolha o ponto exacto no mapa.'); }}>Alterar</button></div>}

              {quoteLoading && <div className="order-state-card" role="status"><span className="order-state-spinner"/><div><strong>A confirmar disponibilidade</strong><p>A validar preço, cobertura e stock com o servidor.</p></div></div>}
              {quote?.available && !quoteLoading && <div className="coverage-card available order-coverage-card"><div className="coverage-icon">✓</div><div className="coverage-content"><strong>Disponibilidade confirmada</strong><span>Empresa responsável: {quote.supplier?.tradeName ?? 'A atribuir pela plataforma'}</span><div className="coverage-meta">{quote.distanceKm != null && <span>{quote.distanceKm.toFixed(1)} km de referência</span>}{quote.estimatedMinutes && <span>Previsão: {quote.estimatedMinutes[0]}–{quote.estimatedMinutes[1]} min</span>}</div></div></div>}
              {quoteError && <div className="coverage-card unavailable order-coverage-card" role="alert"><div className="coverage-icon">!</div><div className="coverage-content"><strong>Disponibilidade por confirmar</strong><span>{quoteError}</span><button type="button" className="text-action order-quote-retry" onClick={() => setQuoteRefreshKey((value) => value + 1)} disabled={!chosen || !address || address.lat == null || address.lng == null || quoteLoading}>Tentar calcular novamente</button></div></div>}

              <div className="order-location-note"><span>ⓘ</span><p>Em Angola, a referência do bairro, portão ou ponto conhecido ajuda quando a rua não tem numeração. Confirme sempre o pin antes de continuar.</p></div>
              <div className="order-step-actions"><button className="secondary-btn" type="button" onClick={() => goToStep(2)}>← Rever entrega</button><button className="primary-btn order-next-btn" type="button" onClick={continueOrder} disabled={locationStatus === 'loading' || mapResolving || quoteLoading || (Boolean(address) && !quote?.available)}>{!address ? 'Definir localização' : quoteLoading ? 'A validar…' : quote?.available ? 'Rever pedido' : 'A aguardar disponibilidade'} <span>→</span></button></div>
            </div>
          )}
        </section>

        <aside className="order-summary order-summary-v2" aria-label="Resumo do pedido">
          <div className="order-summary-header"><div><span className="order-overline">O seu pedido</span><h2>Resumo</h2></div><span className="secure"><span aria-hidden="true">✓</span> Seguro</span></div>
          <div className="order-summary-kind"><span aria-hidden="true">{kindMeta.icon}</span><div><strong>{kindMeta.label}</strong><small>{kindMeta.note}</small></div><button type="button" className="text-action" onClick={() => goToStep(1)}>Editar</button></div>
          <div className="order-summary-product"><div className="order-summary-cylinder"><span>GPL</span></div><div><strong>{chosen ? `${quantity} × ${chosen.label}` : 'Seleccione um produto'}</strong><small>{chosen ? `${chosen.size} · ${formatAOA(chosen.price)} por unidade` : catalogLoading ? 'A carregar catálogo…' : 'Nenhum produto seleccionado'}</small></div><button type="button" className="text-action" onClick={() => goToStep(1)}>Editar</button></div>
          <div className="order-summary-row"><span>Entrega</span><strong>{deliveryType === 'express' ? 'Expressa' : 'Programada'}</strong></div>
          {deliveryType === 'scheduled' && scheduledAt && <div className="order-summary-subrow">{new Date(scheduledAt).toLocaleString('pt-AO', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
          <div className="order-summary-row"><span>Morada</span><strong className="order-summary-address">{address?.address || 'A definir no mapa'}</strong></div>
          <div className="order-summary-row"><span>Pagamento</span><strong>Na entrega</strong></div>
          <div className="order-summary-divider"/>
          <div className="order-summary-price-lines">
            {quote?.available ? <>
              <div><span>Produtos</span><strong>{formatAOA(quote.subtotal)}</strong></div>
              {quote.cylinderFee > 0 && <div><span>Cilindro novo</span><strong>{formatAOA(quote.cylinderFee)}</strong></div>}
              <div><span>Entrega</span><strong>{formatAOA(quote.deliveryFee)}</strong></div>
              <div><span>Taxa de serviço</span><strong>{formatAOA(quote.platformFee)}</strong></div>
              {quote.discount > 0 && <div className="discount"><span>Desconto</span><strong>− {formatAOA(quote.discount)}</strong></div>}
            </> : <p className="order-price-pending">{quoteLoading ? 'O servidor está a calcular o valor final…' : 'O preço final aparece depois de validar o endereço e a disponibilidade.'}</p>}
          </div>
          <div className="order-summary-total"><div><span>Total estimado</span><small>{quote?.available ? 'Valor calculado pelo servidor' : 'Ainda sem cotação válida'}</small></div><strong>{quote?.available ? formatAOA(quote.total) : '—'}</strong></div>
          {quote?.available && changeForAmount && changeForAmount > quote.total && <div className="order-summary-change"><span>Troco estimado</span><strong>{formatAOA(changeForAmount - quote.total)}</strong></div>}
          {currentStep < 3 && <button type="button" className="secondary-btn full order-summary-edit" onClick={() => { if (!chosen) { goToStep(1); return; } if (deliveryType === 'scheduled' && !scheduledAt) { setQuoteError('Escolha a data e a hora pretendidas para a entrega.'); goToStep(2); return; } goToStep(3); }}>Definir localização <span>⌖</span></button>}
          <p className="order-summary-footnote">O valor é recalculado e validado novamente antes de criar o pedido. Nenhuma cobrança é feita nesta etapa.</p>
          <div className="order-summary-assurance"><span>✓</span><p>Sem compromisso até rever e confirmar o pedido.</p></div>
        </aside>
      </div>
    </div>
  );
}
