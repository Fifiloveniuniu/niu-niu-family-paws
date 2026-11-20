import React from 'react';
import Button from './button';

type Props = React.ComponentProps<'button'> & { 'aria-label': string };
/** Secondary actions always share button semantics, styling and a visible tooltip. */
export default function IconButton({ className = '', title, type = 'button', ...props }: Props) {
  return (
    <Button
      variant="icon"
      {...props}
      type={type}
      className={className}
      title={title ?? props['aria-label']}
    />
  );
}
