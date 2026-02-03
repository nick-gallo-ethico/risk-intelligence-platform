/**
 * Location Seeder
 *
 * Creates 50+ global locations across US, EMEA, and APAC regions for the demo tenant.
 * Each location has real city names with fictional Acme Co. addresses.
 *
 * Distribution:
 * - US: 25 locations (New York HQ + major cities)
 * - EMEA: 15 locations (London HQ + European cities)
 * - APAC: 12 locations (Tokyo HQ + Asia-Pacific cities)
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { SEED_CONFIG } from '../seeders/config';

// Seed offset for reproducibility (masterSeed + 200 for locations)
const SEED_OFFSET = 200;

/**
 * Location data structure for seeding
 */
interface LocationData {
  code: string;
  name: string;
  city: string;
  stateProvince?: string;
  country: string;
  countryName: string;
  region: 'US' | 'EMEA' | 'APAC';
  timezone: string;
  isHeadquarters: boolean;
}

/**
 * US State abbreviations and their full names
 */
const US_STATES: Record<string, string> = {
  NY: 'New York',
  IL: 'Illinois',
  CA: 'California',
  TX: 'Texas',
  MA: 'Massachusetts',
  FL: 'Florida',
  GA: 'Georgia',
  WA: 'Washington',
  CO: 'Colorado',
  AZ: 'Arizona',
  PA: 'Pennsylvania',
  MN: 'Minnesota',
  MI: 'Michigan',
  NC: 'North Carolina',
  TN: 'Tennessee',
  OR: 'Oregon',
  IN: 'Indiana',
  OH: 'Ohio',
  MO: 'Missouri',
};

/**
 * US Locations (25 cities)
 */
export const US_LOCATIONS: LocationData[] = [
  { code: 'NYC-HQ', name: 'New York Headquarters', city: 'New York', stateProvince: 'NY', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: true },
  { code: 'CHI-01', name: 'Chicago Office', city: 'Chicago', stateProvince: 'IL', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago', isHeadquarters: false },
  { code: 'LAX-01', name: 'Los Angeles Office', city: 'Los Angeles', stateProvince: 'CA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles', isHeadquarters: false },
  { code: 'SFO-01', name: 'San Francisco Office', city: 'San Francisco', stateProvince: 'CA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles', isHeadquarters: false },
  { code: 'BOS-01', name: 'Boston Office', city: 'Boston', stateProvince: 'MA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: false },
  { code: 'DFW-01', name: 'Dallas Office', city: 'Dallas', stateProvince: 'TX', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago', isHeadquarters: false },
  { code: 'IAH-01', name: 'Houston Office', city: 'Houston', stateProvince: 'TX', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago', isHeadquarters: false },
  { code: 'MIA-01', name: 'Miami Office', city: 'Miami', stateProvince: 'FL', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: false },
  { code: 'ATL-01', name: 'Atlanta Office', city: 'Atlanta', stateProvince: 'GA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: false },
  { code: 'SEA-01', name: 'Seattle Office', city: 'Seattle', stateProvince: 'WA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles', isHeadquarters: false },
  { code: 'DEN-01', name: 'Denver Office', city: 'Denver', stateProvince: 'CO', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Denver', isHeadquarters: false },
  { code: 'PHX-01', name: 'Phoenix Office', city: 'Phoenix', stateProvince: 'AZ', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Phoenix', isHeadquarters: false },
  { code: 'PHL-01', name: 'Philadelphia Office', city: 'Philadelphia', stateProvince: 'PA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: false },
  { code: 'MSP-01', name: 'Minneapolis Office', city: 'Minneapolis', stateProvince: 'MN', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago', isHeadquarters: false },
  { code: 'DTW-01', name: 'Detroit Office', city: 'Detroit', stateProvince: 'MI', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Detroit', isHeadquarters: false },
  { code: 'CLT-01', name: 'Charlotte Office', city: 'Charlotte', stateProvince: 'NC', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: false },
  { code: 'BNA-01', name: 'Nashville Office', city: 'Nashville', stateProvince: 'TN', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago', isHeadquarters: false },
  { code: 'SAN-01', name: 'San Diego Office', city: 'San Diego', stateProvince: 'CA', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles', isHeadquarters: false },
  { code: 'PDX-01', name: 'Portland Office', city: 'Portland', stateProvince: 'OR', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Los_Angeles', isHeadquarters: false },
  { code: 'AUS-01', name: 'Austin Office', city: 'Austin', stateProvince: 'TX', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago', isHeadquarters: false },
  { code: 'RDU-01', name: 'Raleigh Office', city: 'Raleigh', stateProvince: 'NC', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: false },
  { code: 'TPA-01', name: 'Tampa Office', city: 'Tampa', stateProvince: 'FL', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: false },
  { code: 'IND-01', name: 'Indianapolis Office', city: 'Indianapolis', stateProvince: 'IN', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Indiana/Indianapolis', isHeadquarters: false },
  { code: 'CMH-01', name: 'Columbus Office', city: 'Columbus', stateProvince: 'OH', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/New_York', isHeadquarters: false },
  { code: 'STL-01', name: 'St. Louis Office', city: 'St. Louis', stateProvince: 'MO', country: 'US', countryName: 'United States', region: 'US', timezone: 'America/Chicago', isHeadquarters: false },
];

/**
 * EMEA Locations (15 cities)
 */
export const EMEA_LOCATIONS: LocationData[] = [
  { code: 'LON-HQ', name: 'London Headquarters', city: 'London', country: 'GB', countryName: 'United Kingdom', region: 'EMEA', timezone: 'Europe/London', isHeadquarters: true },
  { code: 'FRA-01', name: 'Frankfurt Office', city: 'Frankfurt', country: 'DE', countryName: 'Germany', region: 'EMEA', timezone: 'Europe/Berlin', isHeadquarters: false },
  { code: 'PAR-01', name: 'Paris Office', city: 'Paris', country: 'FR', countryName: 'France', region: 'EMEA', timezone: 'Europe/Paris', isHeadquarters: false },
  { code: 'AMS-01', name: 'Amsterdam Office', city: 'Amsterdam', country: 'NL', countryName: 'Netherlands', region: 'EMEA', timezone: 'Europe/Amsterdam', isHeadquarters: false },
  { code: 'MAD-01', name: 'Madrid Office', city: 'Madrid', country: 'ES', countryName: 'Spain', region: 'EMEA', timezone: 'Europe/Madrid', isHeadquarters: false },
  { code: 'MIL-01', name: 'Milan Office', city: 'Milan', country: 'IT', countryName: 'Italy', region: 'EMEA', timezone: 'Europe/Rome', isHeadquarters: false },
  { code: 'DUB-01', name: 'Dublin Office', city: 'Dublin', country: 'IE', countryName: 'Ireland', region: 'EMEA', timezone: 'Europe/Dublin', isHeadquarters: false },
  { code: 'MUC-01', name: 'Munich Office', city: 'Munich', country: 'DE', countryName: 'Germany', region: 'EMEA', timezone: 'Europe/Berlin', isHeadquarters: false },
  { code: 'ZRH-01', name: 'Zurich Office', city: 'Zurich', country: 'CH', countryName: 'Switzerland', region: 'EMEA', timezone: 'Europe/Zurich', isHeadquarters: false },
  { code: 'STO-01', name: 'Stockholm Office', city: 'Stockholm', country: 'SE', countryName: 'Sweden', region: 'EMEA', timezone: 'Europe/Stockholm', isHeadquarters: false },
  { code: 'CPH-01', name: 'Copenhagen Office', city: 'Copenhagen', country: 'DK', countryName: 'Denmark', region: 'EMEA', timezone: 'Europe/Copenhagen', isHeadquarters: false },
  { code: 'BRU-01', name: 'Brussels Office', city: 'Brussels', country: 'BE', countryName: 'Belgium', region: 'EMEA', timezone: 'Europe/Brussels', isHeadquarters: false },
  { code: 'VIE-01', name: 'Vienna Office', city: 'Vienna', country: 'AT', countryName: 'Austria', region: 'EMEA', timezone: 'Europe/Vienna', isHeadquarters: false },
  { code: 'PRG-01', name: 'Prague Office', city: 'Prague', country: 'CZ', countryName: 'Czech Republic', region: 'EMEA', timezone: 'Europe/Prague', isHeadquarters: false },
  { code: 'WAW-01', name: 'Warsaw Office', city: 'Warsaw', country: 'PL', countryName: 'Poland', region: 'EMEA', timezone: 'Europe/Warsaw', isHeadquarters: false },
];

/**
 * APAC Locations (12 cities)
 */
export const APAC_LOCATIONS: LocationData[] = [
  { code: 'TYO-HQ', name: 'Tokyo Headquarters', city: 'Tokyo', country: 'JP', countryName: 'Japan', region: 'APAC', timezone: 'Asia/Tokyo', isHeadquarters: true },
  { code: 'SIN-01', name: 'Singapore Office', city: 'Singapore', country: 'SG', countryName: 'Singapore', region: 'APAC', timezone: 'Asia/Singapore', isHeadquarters: false },
  { code: 'SYD-01', name: 'Sydney Office', city: 'Sydney', country: 'AU', countryName: 'Australia', region: 'APAC', timezone: 'Australia/Sydney', isHeadquarters: false },
  { code: 'MEL-01', name: 'Melbourne Office', city: 'Melbourne', country: 'AU', countryName: 'Australia', region: 'APAC', timezone: 'Australia/Melbourne', isHeadquarters: false },
  { code: 'SHA-01', name: 'Shanghai Office', city: 'Shanghai', country: 'CN', countryName: 'China', region: 'APAC', timezone: 'Asia/Shanghai', isHeadquarters: false },
  { code: 'BJS-01', name: 'Beijing Office', city: 'Beijing', country: 'CN', countryName: 'China', region: 'APAC', timezone: 'Asia/Shanghai', isHeadquarters: false },
  { code: 'HKG-01', name: 'Hong Kong Office', city: 'Hong Kong', country: 'HK', countryName: 'Hong Kong', region: 'APAC', timezone: 'Asia/Hong_Kong', isHeadquarters: false },
  { code: 'ICN-01', name: 'Seoul Office', city: 'Seoul', country: 'KR', countryName: 'South Korea', region: 'APAC', timezone: 'Asia/Seoul', isHeadquarters: false },
  { code: 'BLR-01', name: 'Bangalore Office', city: 'Bangalore', country: 'IN', countryName: 'India', region: 'APAC', timezone: 'Asia/Kolkata', isHeadquarters: false },
  { code: 'BOM-01', name: 'Mumbai Office', city: 'Mumbai', country: 'IN', countryName: 'India', region: 'APAC', timezone: 'Asia/Kolkata', isHeadquarters: false },
  { code: 'MNL-01', name: 'Manila Office', city: 'Manila', country: 'PH', countryName: 'Philippines', region: 'APAC', timezone: 'Asia/Manila', isHeadquarters: false },
  { code: 'AKL-01', name: 'Auckland Office', city: 'Auckland', country: 'NZ', countryName: 'New Zealand', region: 'APAC', timezone: 'Pacific/Auckland', isHeadquarters: false },
];

/**
 * All locations combined
 */
export const LOCATIONS = {
  US: US_LOCATIONS,
  EMEA: EMEA_LOCATIONS,
  APAC: APAC_LOCATIONS,
};

/**
 * Building name patterns for fictional addresses
 */
const BUILDING_NAMES = [
  'Acme Tower',
  'Acme Plaza',
  'Acme Center',
  'Acme Building',
  'Acme Corporate Center',
  'Innovation Hub',
  'Technology Center',
  'Commerce Building',
  'Enterprise Plaza',
  'Business Center',
];

/**
 * Street name patterns
 */
const STREET_NAMES = [
  'Main Street',
  'Commerce Street',
  'Business Avenue',
  'Corporate Drive',
  'Innovation Way',
  'Enterprise Boulevard',
  'Technology Lane',
  'Market Street',
  'Financial District',
  'Central Avenue',
];

/**
 * Generate a fictional address for a location
 */
function generateAddress(locationName: string): { addressLine1: string; postalCode: string } {
  const buildingName = faker.helpers.arrayElement(BUILDING_NAMES);
  const streetNumber = faker.number.int({ min: 100, max: 999 });
  const streetName = faker.helpers.arrayElement(STREET_NAMES);
  const postalCode = faker.location.zipCode();

  return {
    addressLine1: `${buildingName}, ${streetNumber} ${streetName}`,
    postalCode,
  };
}

/**
 * Seed locations for a demo tenant
 *
 * @param prisma - Prisma client instance
 * @param organizationId - Organization ID to seed locations for
 * @returns Map of location code to location ID for later use in seeding
 */
export async function seedLocations(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Map<string, string>> {
  // Initialize faker with deterministic seed
  faker.seed(SEED_CONFIG.masterSeed + SEED_OFFSET);

  const locationMap = new Map<string, string>();
  const allLocations = [...US_LOCATIONS, ...EMEA_LOCATIONS, ...APAC_LOCATIONS];

  const locationRecords: Array<{
    id: string;
    organizationId: string;
    code: string;
    name: string;
    addressLine1: string;
    city: string;
    stateProvince: string | null;
    postalCode: string;
    country: string;
    countryName: string;
    region: string;
    timezone: string;
    isHeadquarters: boolean;
    isActive: boolean;
  }> = [];

  for (const loc of allLocations) {
    const locationId = faker.string.uuid();
    const address = generateAddress(loc.name);

    locationRecords.push({
      id: locationId,
      organizationId,
      code: loc.code,
      name: loc.name,
      addressLine1: address.addressLine1,
      city: loc.city,
      stateProvince: loc.stateProvince || null,
      postalCode: address.postalCode,
      country: loc.country,
      countryName: loc.countryName,
      region: loc.region,
      timezone: loc.timezone,
      isHeadquarters: loc.isHeadquarters,
      isActive: true,
    });

    locationMap.set(loc.code, locationId);
  }

  // Insert all locations
  await prisma.location.createMany({
    data: locationRecords,
    skipDuplicates: true,
  });

  console.log(`  Created ${US_LOCATIONS.length} US locations`);
  console.log(`  Created ${EMEA_LOCATIONS.length} EMEA locations`);
  console.log(`  Created ${APAC_LOCATIONS.length} APAC locations`);

  return locationMap;
}
