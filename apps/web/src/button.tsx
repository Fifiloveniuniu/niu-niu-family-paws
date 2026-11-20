import React from 'react';

type Props = React.ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'icon' };
const classes = { primary: 'button', secondary: 'language', icon: 'icon-button' };

/** Common action surface; native form behavior and page-specific actions stay with callers. */
export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  return <button {...props} className={[classes[variant], className].filter(Boolean).join(' ')} />;
}
