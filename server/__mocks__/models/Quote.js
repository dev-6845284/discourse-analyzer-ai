const mockConstructor = jest.fn((data) => ({
  save: jest.fn().mockResolvedValue(data),
}));

mockConstructor.find = jest.fn();
mockConstructor.findOne = jest.fn();
mockConstructor.prototype.save = jest.fn();

module.exports = mockConstructor;