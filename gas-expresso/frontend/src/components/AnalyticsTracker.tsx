import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { analyticsAreaForPath, analyticsPathTemplate, trackAnalyticsEvent } from '../services/analytics';

function clickableTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest<HTMLElement>('a, button, [role="button"], [data-analytics]');
}

function labelFor(target: HTMLElement): string {
  const explicit = target.dataset.analytics?.trim();
  if (explicit) return explicit.slice(0, 100);
  const aria = target.getAttribute('aria-label')?.trim();
  if (aria) return aria.slice(0, 100);
  const title = target.getAttribute('title')?.trim();
  if (title) return title.slice(0, 100);
  // Só lê o texto visível do botão/ligação. Não lê valores de inputs.
  return (target.innerText || target.textContent || target.tagName).replace(/\s+/g, ' ').trim().slice(0, 100) || target.tagName;
}

export function AnalyticsTracker() {
  const location = useLocation();
  const lastPageEvent = useRef('');

  useEffect(() => {
    const pageKey = `${location.pathname}${location.search}`;
    if (lastPageEvent.current === pageKey) return;
    lastPageEvent.current = pageKey;
    void trackAnalyticsEvent({
      eventType: 'PAGE_VIEW',
      area: analyticsAreaForPath(location.pathname),
      path: analyticsPathTemplate(location.pathname),
    }).catch(() => undefined);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = clickableTarget(event.target);
      if (!target || target.hasAttribute('data-analytics-ignore')) return;
      // Evita registar ligações externas e acções de extensões/browser.
      const anchor = target.closest('a');
      if (anchor?.target === '_blank' && anchor.origin !== window.location.origin) return;
      void trackAnalyticsEvent({
        eventType: 'CLICK',
        area: analyticsAreaForPath(window.location.pathname),
        path: analyticsPathTemplate(window.location.pathname),
        target: labelFor(target),
      }).catch(() => undefined);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
