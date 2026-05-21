/**
 * ConnectedBand — "Connected Enterprise Business Transformation".
 *
 * Replaces the prior "Connected Finance Intelligence · 2026" treatment.
 * No Liquid Glass per brief: a clean cream text band with subtle
 * gradient dividers above and below.
 */

export function ConnectedBand() {
  return (
    <section id="partners" className="connected-band" aria-labelledby="connected-band-heading">
      <div className="connected-band__eyebrow">Connected Enterprise Business Transformation</div>
      <h2 id="connected-band-heading" className="connected-band__heading">
        Keep your finance function <em style={{ color: "#8E4F67", fontStyle: "normal", fontWeight: 400 }}>finally connected</em>.
      </h2>
      <p className="connected-band__sub">Proudly partnering with Abacum and OneStream.</p>
      <p className="connected-band__body">
        Make sense of your finance data from ERP and EPM. One source of truth across every system you own.
      </p>
    </section>
  );
}
