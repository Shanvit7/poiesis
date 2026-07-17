export const Footer = () => (
  <footer className="fixed inset-x-0 bottom-0 flex flex-col items-center">
    <div className="flex h-10 items-center justify-center">
      <p className="font-mono text-[0.625rem] tracking-wide text-muted">© 2026 Poiesis</p>
    </div>
    {/* Pushes footer down on notch / home-indicator devices */}
    <div aria-hidden className="pb-safe" />
  </footer>
)
