import styles from './styles.module.css';
import cn from 'classnames';

export function ExpressionsComponent({ isActive }: { isActive: boolean }) {
  return (
    <div className={styles.container}>
      <span className={`text ${isActive ? 'active' : ''}`}>
        Template literal
      </span>
      <p className={isActive ? 'visible' : 'hidden'}>
        Ternary
      </p>
      <section className={cn('base', { highlight: isActive })}>
        Function call
      </section>
    </div>
  );
}
