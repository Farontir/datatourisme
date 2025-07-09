import React from 'react';
import { StructuredData } from './StructuredData';
import { 
  generateWebsiteStructuredData, 
  generateOrganizationStructuredData,
  type SEOConfig 
} from '../../lib/seo';

interface SEOHeadProps {
  structuredData?: Array<Record<string, any>>;
  includeDefaults?: boolean;
}

export function SEOHead({ structuredData = [], includeDefaults = true }: SEOHeadProps) {
  const allStructuredData = [...structuredData];
  
  if (includeDefaults) {
    allStructuredData.push(
      generateWebsiteStructuredData(),
      generateOrganizationStructuredData()
    );
  }
  
  return (
    <>
      {allStructuredData.map((data, index) => (
        <StructuredData key={index} data={data} />
      ))}
    </>
  );
}