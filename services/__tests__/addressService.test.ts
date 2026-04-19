import { api } from '@/lib/apiClient';
import {
  addAddress,
  deleteAddress,
  getUserAddresses,
  updateAddress,
} from '../addressService';

jest.mock('@/lib/apiClient', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const apiGetMock = api.get as jest.MockedFunction<typeof api.get>;
const apiPostMock = api.post as jest.MockedFunction<typeof api.post>;
const apiPatchMock = api.patch as jest.MockedFunction<typeof api.patch>;
const apiDeleteMock = api.delete as jest.MockedFunction<typeof api.delete>;

describe('addressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes backend address rows that use address_id and postal_code', async () => {
    apiGetMock.mockResolvedValue({
      addresses: [
        {
          address_id: 'address-1',
          label: 'Home',
          street: '123 Mabini Street',
          city: 'Quezon City',
          province: 'Metro Manila',
          postal_code: '1100',
        },
      ],
    } as any);

    const result = await getUserAddresses();

    expect(apiGetMock).toHaveBeenCalledWith('/addresses');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'address-1',
        address_id: 'address-1',
        street: '123 Mabini Street',
        street_address: '123 Mabini Street',
        zip_code: '1100',
        postal_code: '1100',
      }),
    );
  });

  it('waits for async materialization and returns the created address with normalized id', async () => {
    apiPostMock.mockResolvedValue({ status: 'accepted' } as any);
    apiGetMock
      .mockResolvedValueOnce({ addresses: [] } as any)
      .mockResolvedValueOnce({
        addresses: [
          {
            address_id: 'address-2',
            label: 'Home',
            street_address: '88 Scout Rallos',
            city: 'Quezon City',
            province: 'Metro Manila',
            zip_code: '1103',
          },
        ],
      } as any);

    const created = await addAddress({
      label: 'Home',
      street_address: '88 Scout Rallos',
      city: 'Quezon City',
      province: 'Metro Manila',
      zip_code: '1103',
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/addresses',
      expect.objectContaining({
        label: 'Home',
        street_address: '88 Scout Rallos',
        street: '88 Scout Rallos',
        city: 'Quezon City',
        province: 'Metro Manila',
        zip_code: '1103',
        postal_code: '1103',
      }),
    );
    expect(created).toEqual(
      expect.objectContaining({
        id: 'address-2',
        address_id: 'address-2',
      }),
    );
  });

  it('normalizes payloads when updating an address', async () => {
    apiPatchMock.mockResolvedValue({ status: 'ok' } as any);

    await updateAddress('addr-1', {
      label: ' Office ',
      street: ' 742 Evergreen Terrace ',
      city: ' Springfield ',
      province: ' Illinois ',
      zip_code: ' 62704 ',
      latitude: 14.1234,
      longitude: 121.5678,
      is_default: true,
    });

    expect(apiPatchMock).toHaveBeenCalledWith(
      '/addresses/addr-1',
      expect.objectContaining({
        label: 'Office',
        street_address: '742 Evergreen Terrace',
        street: '742 Evergreen Terrace',
        city: 'Springfield',
        province: 'Illinois',
        zip_code: '62704',
        postal_code: '62704',
        latitude: 14.1234,
        longitude: 121.5678,
        is_default: true,
      }),
    );
  });

  it('calls delete endpoint for an address id', async () => {
    apiDeleteMock.mockResolvedValue(undefined as any);

    await deleteAddress('addr-2');

    expect(apiDeleteMock).toHaveBeenCalledWith('/addresses/addr-2');
  });

  it('throws when street address is missing before save', async () => {
    await expect(
      addAddress({
        label: 'Home',
        city: 'Quezon City',
        province: 'Metro Manila',
      }),
    ).rejects.toThrow('Please provide a valid street address before saving.');

    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it('accepts API responses that return rows in data[]', async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          id: 'address-3',
          label: 'Work',
          street_address: 'Ayala Ave',
          city: 'Makati',
          province: 'Metro Manila',
          zip_code: '1226',
        },
      ],
    } as any);

    const result = await getUserAddresses();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'address-3',
        street: 'Ayala Ave',
        zip_code: '1226',
      }),
    );
  });

  it('throws when address creation is accepted but not materialized yet', async () => {
    apiPostMock.mockResolvedValue({ status: 'accepted' } as any);
    apiGetMock.mockResolvedValue({ addresses: [] } as any);

    await expect(
      addAddress({
        label: 'Home',
        street_address: '123 Main',
        city: 'Quezon City',
        province: 'Metro Manila',
        zip_code: '1100',
      }),
    ).rejects.toThrow(
      'Address save was accepted but is still processing. Please refresh and try again.',
    );
  });
});
