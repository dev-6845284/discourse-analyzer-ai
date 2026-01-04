const mockConstructor = jest.fn((data) => ({
  save: jest.fn().mockResolvedValue(data),
}));

mockConstructor.findOne = jest.fn();
mockConstructor.create = jest.fn();
mockConstructor.prototype.save = jest.fn();

module.exports = mockConstructor;