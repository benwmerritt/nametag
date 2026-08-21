import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectionFindUnique: vi.fn(),
  connectionUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  personFindMany: vi.fn(),
  personUpdate: vi.fn(),
  mappingFindMany: vi.fn(),
  mappingCreate: vi.fn(),
  createVCard: vi.fn(),
  personToVCard: vi.fn(),
  buildLocalHash: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    cardDavConnection: {
      findUnique: mocks.connectionFindUnique,
      update: mocks.connectionUpdate,
    },
    user: { findUnique: mocks.userFindUnique },
    person: {
      findMany: mocks.personFindMany,
      update: mocks.personUpdate,
    },
    cardDavMapping: {
      findMany: mocks.mappingFindMany,
      create: mocks.mappingCreate,
    },
  },
}));

vi.mock('@/lib/carddav/client', () => ({
  createCardDavClient: vi.fn(() => Promise.resolve({
    fetchAddressBooks: vi.fn(() => Promise.resolve([{ url: 'https://carddav.example.com/book/', raw: {} }])),
    createVCard: mocks.createVCard,
  })),
}));

vi.mock('@/lib/carddav/address-book', () => ({
  getAddressBook: vi.fn(() => Promise.resolve({ url: 'https://carddav.example.com/book/', raw: {} })),
}));

vi.mock('@/lib/carddav/vcard-export', () => ({
  personToVCard: mocks.personToVCard,
}));

vi.mock('@/lib/carddav/hash', () => ({
  buildLocalHash: mocks.buildLocalHash,
}));

vi.mock('@/lib/logger', () => ({
  createModuleLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'generated-uid'),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: 'user-1', email: 'test@example.com', name: 'Test' } })),
}));

import { POST } from '@/app/api/carddav/export-bulk/route';

function makePerson() {
  return {
    id: 'person-1',
    userId: 'user-1',
    name: 'Jamie',
    surname: 'Example',
    uid: null,
    cardDavSyncEnabled: false,
    photo: null,
    phoneNumbers: [],
    emails: [],
    addresses: [],
    urls: [],
    imHandles: [],
    locations: [],
    customFields: [],
    customFieldValues: [],
    importantDates: [],
    relationshipsFrom: [],
    groups: [],
  };
}

describe('POST /api/carddav/export-bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connectionFindUnique.mockResolvedValue({
      id: 'connection-1',
      userId: 'user-1',
      syncEnabled: true,
      cardDavNameFormat: 'FULL',
    });
    mocks.userFindUnique.mockResolvedValue({ nameOrder: 'WESTERN' });
    mocks.personFindMany.mockResolvedValue([makePerson()]);
    mocks.personUpdate.mockResolvedValue({});
    mocks.mappingFindMany.mockResolvedValue([]);
    mocks.mappingCreate.mockResolvedValue({});
    mocks.connectionUpdate.mockResolvedValue({});
    mocks.createVCard.mockResolvedValue({
      url: 'https://carddav.example.com/book/generated-uid.vcf',
      etag: 'etag-1',
      data: 'vcard',
    });
    mocks.personToVCard.mockImplementation((person: { uid: string | null }) => {
      if (!person.uid) throw new Error('UID missing from in-memory person');
      return `BEGIN:VCARD\r\nVERSION:3.0\r\nUID:${person.uid}\r\nEND:VCARD`;
    });
    mocks.buildLocalHash.mockReturnValue('hash-1');
  });

  it('sets a generated UID on the in-memory person before rendering the vCard', async () => {
    const response = await POST(new Request('http://localhost/api/carddav/export-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personIds: ['person-1'] }),
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ success: true, exported: 1, errors: 0 });
    expect(mocks.personUpdate).toHaveBeenCalledWith({
      where: { id: 'person-1' },
      data: { uid: 'generated-uid' },
    });
    expect(mocks.personToVCard).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'generated-uid' }),
      expect.any(Object),
    );
    expect(mocks.createVCard).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('UID:generated-uid'),
      'generated-uid.vcf',
    );
  });
});
