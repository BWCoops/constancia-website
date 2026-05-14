/**
 * Company Repository Implementation
 * 
 * Implements ICompanyRepository interface by wrapping the FinanceCompass storage layer.
 * Maps between database records and domain types.
 * 
 * @generated-by-ai (human-reviewed)
 */

import type { ICompanyRepository, CreateCompanyData } from '../../core/finance-compass/interfaces';
import type { Company } from '../../core/finance-compass/types';
import { mapDbCompanyToDomain } from './mappers';
import * as fcStorage from '../../finance-compass/storage';

export class CompanyRepository implements ICompanyRepository {
  async findById(id: string): Promise<Company | null> {
    const dbCompany = await fcStorage.getCompanyById(id);
    return dbCompany ? mapDbCompanyToDomain(dbCompany) : null;
  }

  async findByName(_name: string): Promise<Company | null> {
    throw new Error(
      'CompanyRepository.findByName: Not implemented. ' +
      'FinanceCompass storage layer does not yet support lookup by company name. ' +
      'Implement fcStorage.getCompanyByName to enable this method.'
    );
  }

  async create(data: CreateCompanyData): Promise<Company> {
    const revenueMillions = data.revenue ? parseRevenueToMillions(data.revenue) : null;
    
    const dbCompany = await fcStorage.createCompany({
      name: data.name,
      sector: data.industry,
      sizeBand: data.size,
      revenueMillions,
      country: data.country,
    });
    return mapDbCompanyToDomain(dbCompany);
  }

  async update(id: string, data: Partial<Company>): Promise<Company | null> {
    const updateData: Parameters<typeof fcStorage.updateCompany>[1] = {};
    
    if (data.name) updateData.name = data.name;
    if (data.industry !== undefined) updateData.sector = data.industry;
    if (data.size !== undefined) updateData.sizeBand = data.size;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.revenue !== undefined) {
      updateData.revenueMillions = data.revenue ? parseRevenueToMillions(data.revenue) : null;
    }

    const dbCompany = await fcStorage.updateCompany(id, updateData);
    return dbCompany ? mapDbCompanyToDomain(dbCompany) : null;
  }
}

function parseRevenueToMillions(revenue: string): number | null {
  const cleaned = revenue.replace(/[^0-9.MBKmBK]/g, '').toUpperCase();
  const match = cleaned.match(/^([\d.]+)([MBK])?$/);
  
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const suffix = match[2];
  
  switch (suffix) {
    case 'B':
      return value * 1000;
    case 'M':
      return value;
    case 'K':
      return value / 1000;
    default:
      return value;
  }
}

export function createCompanyRepository(): ICompanyRepository {
  return new CompanyRepository();
}
