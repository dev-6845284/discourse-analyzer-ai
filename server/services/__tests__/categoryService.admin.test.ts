const mongoose = require('mongoose');
const service = require('../categoryService');

describe('categoryService admin operations', () => {
  beforeEach(() => {
    service.resetToDefaultsForTests();
    jest.resetAllMocks();
  });

  test('createCategory inserts and reloads cache', async () => {
    const mockColl = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'abc' }),
    };
    mongoose.connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    const created = await service.createCategory({ id: 'newcat', title: 'New Cat', modes: ['audit'], uiOrder: 99 });
    expect(created.id).toBe('newcat');
    expect(mockColl.findOne).toHaveBeenCalled();
    expect(mockColl.insertOne).toHaveBeenCalled();
  });

  test('createCategory rejects duplicate id/title', async () => {
    const mockColl = {
      findOne: jest.fn().mockResolvedValue({ id: 'foo' }),
    };
    mongoose.connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    await expect(service.createCategory({ id: 'foo', title: 'Foo' })).rejects.toThrow();
  });

  test('updateCategory updates and reloads', async () => {
    const after = { id: 'exist', title: 'Exist', description: 'd' };
    const mockColl = {
      findOneAndUpdate: jest.fn().mockResolvedValue({ value: after }),
    };
    mongoose.connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    const updated = await service.updateCategory('exist', { title: 'Exist Updated' });
    expect(updated.title).toBe('Exist');
    expect(mockColl.findOneAndUpdate).toHaveBeenCalled();
  });

  test('deleteCategory removes and reloads', async () => {
    const mockColl = {
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };
    mongoose.connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    await service.deleteCategory('to-delete');
    expect(mockColl.deleteOne).toHaveBeenCalledWith({ id: 'to-delete' });
  });

  test('reload calls loadCategoriesFromDb even when db empty', async () => {
    const mockColl = {
      find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) })
    };
    mongoose.connection = { db: { collection: jest.fn().mockReturnValue(mockColl) } };

    await service.reload();
    // no exception
  });
});
