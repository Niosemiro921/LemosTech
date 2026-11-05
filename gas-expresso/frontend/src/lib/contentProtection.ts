const isEditableTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable === true;
};

const block = (event: Event) => event.preventDefault();

const onKeyDown = (event: KeyboardEvent) => {
  if (!event.ctrlKey && !event.metaKey) return;
  if (event.key === '+' || event.key === '-' || event.key === '=' || event.key === '0') event.preventDefault();
};

const onWheel = (event: WheelEvent) => {
  if (event.ctrlKey) event.preventDefault();
};

const onTouchMove = (event: TouchEvent) => {
  if (event.touches.length > 1) event.preventDefault();
};

const onSelectStart = (event: Event) => {
  if (!isEditableTarget(event.target)) event.preventDefault();
};

const onCopyCut = (event: ClipboardEvent) => {
  if (!isEditableTarget(event.target)) event.preventDefault();
};

export function installContentProtection(): void {
  document.addEventListener('contextmenu', block);
  document.addEventListener('copy', onCopyCut);
  document.addEventListener('cut', onCopyCut);
  document.addEventListener('dragstart', block);
  document.addEventListener('selectstart', onSelectStart);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('wheel', onWheel, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('gesturestart', block as EventListener);
  document.addEventListener('gesturechange', block as EventListener);
  document.addEventListener('gestureend', block as EventListener);
}
