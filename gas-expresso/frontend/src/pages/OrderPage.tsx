import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gasProducts, formatAOA } from '../services/catalog';
import { useOrderStore } from '../stores/orderStore';
import { RealMap } from '../components/RealMap';
import { reverseGeocode, searchAddress, type GeocodingResult } from '../services/geocoding';
import type { DeliveryType } from '../types/gas';
import { resolveCoverage, type CoverageResult } from '../services/coverage';
import { calculateQuote } from '../services/pricing';
import { resolveInventoryAvailability, type InventoryAvailability } from '../services/inventory';


export default function OrderPage() {
  const navigate = useNavigate();
  const {
    selectedProduct,
    quantity,
    address,
    deliveryType,
    scheduledAt,
    setProduct,
    setQuantity,
    setAddress,
    setDeliveryType,
    setScheduledAt,
  } = useOrderStore();
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationMessage, setLocationMessage] = useState('Ative a localização para encontrarmos a melhor entrega.');
  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [mapResolving, setMapResolving] = useState(false);
  const coverage: CoverageResult | null = address?.lat != null && address?.lng != null
    ? resolveCoverage({ lat: address.lat, lng: address.lng })
    : null;

  const chosen = selectedProduct ?? gasProducts[1];

  const inventory: InventoryAvailability = resolveInventoryAvailability({
    lat: address?.lat ?? null,
    lng: address?.lng ?? null,
    product: chosen,
    quantity,
  });

  useEffect(() => {
    if (!selectedProduct) setProduct(gasProducts[1]);
  }, [selectedProduct, setProduct]);

  const quote = useMemo(
    () =>
      calculateQuote({
        product: chosen,
        quantity,
        deliveryType,
        distanceKm: coverage?.distanceKm ?? null,
        etaMinutes: coverage?.etaMinutes ?? null,
      }),
    [chosen, quantity, deliveryType, coverage?.distanceKm, coverage?.etaMinutes],
  );

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationMessage('Este navegador não disponibiliza geolocalização.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('A obter a sua localização...');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setAddress({
          label: 'Minha localização',
          address: 'Localização atual — coordenadas prontas para o mapa',
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
    setLocationMessage('A procurar o endereço...');
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
    setLocationMessage('A identificar o ponto selecionado...');
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
      setLocationMessage('Ponto definido pelas coordenadas.');
    } finally {
      setMapResolving(false);
    }
  };

  const continueOrder = () => {
    if (!address) {
      requestLocation();
      return;
    }
    if (deliveryType === 'scheduled' && !scheduledAt) return;
    if (!coverage?.available) return;
    if (!inventory.available) return;
    navigate('/confirmar');
  };

  const minSchedule = new Date(Date.now() + 60 * 60 * 1000);
  const minScheduleValue = new Date(minSchedule.getTime() - minSchedule.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="page order-page">
      <div className="page-heading order-heading">
        <div>
          <span className="section-kicker">Novo pedido</span>
          <h1>Peça o seu gás.</h1>
          <p>Escolha a botija, indique onde entregar e veja a estimativa antes de confirmar.</p>
        </div>
        <div className="order-progress" aria-label="Progresso do pedido">
          <span className="active">1</span><i /><span>2</span><i /><span>3</span>
        </div>
      </div>

      <div className="order-layout">
        <section className="order-main">
          <div className="step-card">
            <div className="step-head"><span className="step-number">01</span><div><h2>Escolha a botija</h2><p>Selecione o tamanho que precisa.</p></div></div>
            <div className="product-grid">
              {gasProducts.map(product => (
                <button key={product.id} onClick={() => setProduct(product)} className={`product-card ${chosen.id === product.id ? 'selected' : ''}`} aria-pressed={chosen.id === product.id}>
                  {product.popular && <span className="popular-badge">Mais pedido</span>}
                  <div className="cylinder">GÁS</div>
                  <strong>{product.label}</strong>
                  <span>{formatAOA(product.price)}</span>
                  <small>{product.description}</small>
                </button>
              ))}
            </div>
            <div className="quantity-row">
              <div><strong>Quantidade</strong><small>Máximo de 20 unidades por pedido na V1.</small></div>
              <div className="qty-control" aria-label="Quantidade">
                <button onClick={() => setQuantity(quantity - 1)} disabled={quantity === 1} aria-label="Diminuir">−</button>
                <strong>{quantity}</strong>
                <button onClick={() => setQuantity(quantity + 1)} disabled={quantity === 20} aria-label="Aumentar">+</button>
              </div>
            </div>
          </div>

          <div className="step-card">
            <div className="step-head"><span className="step-number">02</span><div><h2>Quando quer receber?</h2><p>Escolha entre urgência ou planeamento.</p></div></div>
            <div className="delivery-options">
              <button className={deliveryType === 'express' ? 'delivery-option selected' : 'delivery-option'} onClick={() => setDeliveryType('express')} aria-pressed={deliveryType === 'express'}>
                <span>⚡</span><div><strong>Entrega expressa</strong><small>Prioridade · estimativa 20–40 min</small></div><b>+ {formatAOA(calculateQuote({ product: chosen, quantity: 1, deliveryType: 'express', distanceKm: coverage?.distanceKm ?? null }).deliveryFee)}</b>
              </button>
              <button className={deliveryType === 'scheduled' ? 'delivery-option selected' : 'delivery-option'} onClick={() => setDeliveryType('scheduled')} aria-pressed={deliveryType === 'scheduled'}>
                <span>◷</span><div><strong>Entrega programada</strong><small>Escolha um horário mais conveniente</small></div><b>+ {formatAOA(calculateQuote({ product: chosen, quantity: 1, deliveryType: 'scheduled', distanceKm: coverage?.distanceKm ?? null }).deliveryFee)}</b>
              </button>
            </div>
            {deliveryType === 'scheduled' && (
              <div className="scheduled-field">
                <label htmlFor="scheduledAt">Data e hora</label>
                <input id="scheduledAt" className="input" type="datetime-local" min={minScheduleValue} value={scheduledAt ?? ''} onChange={(event) => setScheduledAt(event.target.value || null)} />
              </div>
            )}
          </div>

          <div className="step-card">
            <div className="step-head"><span className="step-number">03</span><div><h2>Local de entrega</h2><p>O sistema usa esta posição para calcular disponibilidade, distância e rota.</p></div></div>
            <form className="address-search" onSubmit={handleAddressSearch}>
              <div className="address-search-field">
                <span>⌕</span>
                <input
                  className="input"
                  value={addressQuery}
                  onChange={(event) => setAddressQuery(event.target.value)}
                  placeholder="Pesquise rua, bairro ou município"
                  aria-label="Pesquisar endereço"
                />
              </div>
              <button className="secondary-btn" type="submit" disabled={searchingAddress}>
                {searchingAddress ? 'A pesquisar…' : 'Pesquisar'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="address-results">
                {searchResults.map((result, index) => (
                  <button key={`${result.lat}-${result.lng}-${index}`} className="address-result" type="button" onClick={() => applyGeocodingResult(result)}>
                    <span className="result-pin">⌖</span>
                    <span><strong>{result.displayName}</strong><small>Selecionar este ponto</small></span>
                    <span>→</span>
                  </button>
                ))}
              </div>
            )}

            <button className={`location-picker ${locationStatus}`} onClick={requestLocation} disabled={locationStatus === 'loading' || mapResolving} type="button">
              <span className="location-icon">⌖</span>
              <div><strong>{address?.label ?? 'Usar a minha localização'}</strong><small>{locationStatus === 'loading' ? 'A identificar a localização…' : locationMessage}</small></div>
              <span>{locationStatus === 'success' ? '✓' : '→'}</span>
            </button>
            <RealMap compact value={address?.lat != null && address?.lng != null ? { lat: address.lat, lng: address.lng } : null} onChange={handleMapChange} />
            {address && <div className="selected-location-card"><span>✓</span><div><strong>Ponto de entrega</strong><small>{address.address}</small></div></div>}
            {coverage && (
              <div className={`coverage-card ${coverage.available ? 'available' : 'unavailable'}`}>
                <div className="coverage-icon">{coverage.available ? '✓' : '!'}</div>
                <div className="coverage-content">
                  <strong>{coverage.available ? 'Entrega disponível nesta área' : 'Área ainda não coberta'}</strong>
                  <span>{coverage.note}</span>
                  {coverage.available && coverage.distanceKm != null && coverage.etaMinutes && (
                    <div className="coverage-meta">
                      <span>≈ {coverage.distanceKm.toFixed(1)} km até o centro operacional</span>
                      <span>⚡ {coverage.etaMinutes[0]}–{coverage.etaMinutes[1]} min</span>
                    </div>
                  )}
                  {!coverage.available && coverage.distanceKm != null && coverage.hub && (
                    <span>A operação mais próxima está a aproximadamente {coverage.distanceKm.toFixed(1)} km.</span>
                  )}
                </div>
              </div>
            )}
            {address && coverage?.available && (
              <div className={`inventory-card ${inventory.available ? 'available' : 'unavailable'} ${inventory.status === 'low' ? 'low' : ''}`}>
                <div className="inventory-icon">{inventory.available ? '✓' : '!'}</div>
                <div className="inventory-content">
                  <div className="inventory-title-row">
                    <strong>{inventory.available ? 'Stock disponível' : 'Stock insuficiente'}</strong>
                    {inventory.supplier?.verified && <span className="verified-pill">✓ Parceiro verificado</span>}
                  </div>
                  <span>{inventory.message}</span>
                  {inventory.supplier && (
                    <div className="inventory-meta">
                      <span>{inventory.supplier.area}</span>
                      <span>{inventory.availableUnits} unidade(s) disponíveis</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <p className="map-help">A distância e o stock exibidos nesta fase são estimativas de interface. O backend fará a validação oficial e a reserva antes do pagamento.</p>
          </div>
        </section>

        <aside className="order-summary">
          <div className="summary-top"><span>Resumo do pedido</span><span className="secure">● Seguro</span></div>
          <div className="summary-product"><div className="cylinder small">GÁS</div><div><strong>{quantity} × {chosen.label}</strong><small>Preço estimado do produto</small></div></div>
          <div className="summary-lines">
            <div><span>Produtos</span><strong>{formatAOA(quote.subtotal)}</strong></div>
            <div><span>Entrega</span><strong>{formatAOA(quote.deliveryFee)}</strong></div>
            <div><span>Comissão Gás Expresso</span><strong>{formatAOA(quote.platformFee)}</strong></div>
            {quote.discount > 0 && <div><span>Desconto</span><strong>- {formatAOA(quote.discount)}</strong></div>}
          </div>
          <div className="summary-total"><span>Total estimado</span><strong>{formatAOA(quote.total)}</strong></div>
          <button className="primary-btn full" onClick={continueOrder} disabled={locationStatus === 'loading' || (deliveryType === 'scheduled' && !scheduledAt) || Boolean(address && coverage && (!coverage.available || !inventory.available))}>
            {!address ? 'Definir localização' : !coverage?.available ? 'Área sem cobertura' : !inventory.available ? 'Stock insuficiente' : 'Continuar para confirmação'} <span>→</span>
          </button>
          <p className="summary-note">Estimativa atual da interface. O backend calculará e confirmará o preço oficial antes do pagamento.</p>
        </aside>
      </div>
      <Link to="/" className="back-link">← Voltar para início</Link>
    </div>
  );
}
