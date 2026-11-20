import React from 'react';
import Icon from './icons';

type Props = React.ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'icon';
  icon?: React.ComponentProps<typeof Icon>['name'];
};
const classes = { primary: 'button', secondary: 'language', icon: 'icon-button' };

/** Common action surface; native form behavior and page-specific actions stay with callers. */
export default function Button({
  variant = 'primary',
  className = '',
  icon,
  children,
  ...props
}: Props) {
  return (
    <button {...props} className={[classes[variant], className].filter(Boolean).join(' ')}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
