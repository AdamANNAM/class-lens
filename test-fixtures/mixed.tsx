import { MyComponent } from './MyComponent';
import { Motion } from 'framer-motion';

export function MixedComponent() {
  return (
    <>
      <div className="plain-div">
        <MyComponent className="custom-component">
          <span>Inside custom component</span>
        </MyComponent>
      </div>
      <Motion.div className="animated-div">
        <div>
          <p className="no-closing-sibling">Text</p>
        </div>
      </Motion.div>
      <div id="no-class">
        <span className="has-class">With class</span>
      </div>
    </>
  );
}
