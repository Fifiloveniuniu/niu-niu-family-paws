import React from 'react';

/** Keep page-specific labels and filtering while sharing the search-field contract. */
export default function SearchInput(props: Omit<React.ComponentProps<'input'>, 'type'>) {
  return <input {...props} type="search" />;
}
