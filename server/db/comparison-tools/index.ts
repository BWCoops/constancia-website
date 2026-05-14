/**
 * Comparison Tools Domain Repository Index
 * 
 * Exports all repository implementations and factory functions
 * for the comparison tools domain (vendors, comparisons).
 */

import type { IStorage } from '../../storage';
import type { IVendorRepository } from '../../core/comparison-tools/interfaces';

import { VendorRepository, createVendorRepository } from './vendor.repository';

export { VendorRepository, createVendorRepository } from './vendor.repository';

export function createComparisonToolsRepositories(storage: IStorage): {
  vendorRepository: IVendorRepository;
} {
  return {
    vendorRepository: createVendorRepository(storage),
  };
}
