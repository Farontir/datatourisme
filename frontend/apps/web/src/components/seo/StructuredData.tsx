import React from 'react';

interface StructuredDataProps {
  data: Record<string, any> | Array<Record<string, any>>;
}

export function StructuredData({ data }: StructuredDataProps) {
  const jsonLd = Array.isArray(data) ? data : [data];
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd.length === 1 ? jsonLd[0] : jsonLd, null, 0),
      }}
    />
  );
}