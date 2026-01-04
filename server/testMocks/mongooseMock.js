// Minimal mock for mongoose used in server tests
const Types = {
  ObjectId: function (id) { this._id = id || 'mockid'; this.toString = () => String(this._id); },
  Mixed: class { },
};

function Schema(definition) {
  this.definition = definition;
}
Schema.Types = Types;
Schema.prototype.index = function () { /* no-op for tests */ };
Schema.prototype.pre = function () { /* no-op for tests */ };
Schema.prototype.post = function () { /* no-op for tests */ };
Schema.prototype.methods = {};
Schema.prototype.statics = {};

const models = {};

// Provide default mock models so imports return mocks that tests can stub
models.Quote = jest.fn();
models.Quote.find = jest.fn();
models.Quote.findOne = jest.fn();
models.Person = jest.fn();
models.Person.findOne = jest.fn();
models.Person.create = jest.fn();

function model(name, schema) {
  if (!models[name]) {
    models[name] = jest.fn();
  }
  models[name].schema = schema;
  return models[name];
}

module.exports = {
  Types,
  Schema,
  models,
  model,
  connect: jest.fn(),
  disconnect: jest.fn(),
  isValidObjectId: (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id),
};