import { cn } from '../cn';

describe('cn utility', () => {
  it('should merge classes correctly', () => {
    const result = cn('bg-red-500', 'text-white');
    expect(result).toBe('bg-red-500 text-white');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('should handle false conditions', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class');
  });

  it('should merge conflicting Tailwind classes correctly', () => {
    // This should favor the last class when they conflict
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base-class', undefined, null, 'another-class');
    expect(result).toBe('base-class another-class');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle objects with boolean values', () => {
    const result = cn({
      'active': true,
      'inactive': false,
      'base': true,
    });
    expect(result).toBe('active base');
  });

  it('should handle complex combinations', () => {
    const isActive = true;
    const isDisabled = false;
    
    const result = cn(
      'btn',
      'btn-primary',
      {
        'btn-active': isActive,
        'btn-disabled': isDisabled,
      },
      isActive && 'hover:btn-primary-dark',
      'focus:ring-2'
    );
    
    expect(result).toBe('btn btn-primary btn-active hover:btn-primary-dark focus:ring-2');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(undefined)).toBe('');
    expect(cn(null)).toBe('');
  });

  it('should trim whitespace', () => {
    const result = cn('  class1  ', '  class2  ');
    expect(result).toBe('class1 class2');
  });

  it('should handle duplicate classes', () => {
    const result = cn('class1', 'class2', 'class1');
    // tailwind-merge should deduplicate
    expect(result.split(' ').filter(c => c === 'class1')).toHaveLength(1);
  });

  it('should work with responsive classes', () => {
    const result = cn('block', 'md:flex', 'lg:grid');
    expect(result).toBe('block md:flex lg:grid');
  });

  it('should work with hover and focus states', () => {
    const result = cn('bg-blue-500', 'hover:bg-blue-600', 'focus:bg-blue-700');
    expect(result).toBe('bg-blue-500 hover:bg-blue-600 focus:bg-blue-700');
  });
});