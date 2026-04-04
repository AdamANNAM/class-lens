export function SelfClosingComponent() {
  return (
    <div className="wrapper">
      <img className="hero-image" src="/hero.png" alt="Hero" />
      <br />
      <input className="text-field" type="text" />
      <hr className="divider" />
      <p className="caption">Below the self-closing tags</p>
    </div>
  );
}
