export function NestedComponent() {
  return (
    <div className="outer">
      <div className="middle">
        <div className="inner">
          <span className="text">Deeply nested</span>
        </div>
      </div>
    </div>
  );
}
