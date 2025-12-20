// Minimal mock for bson used in tests
module.exports = {
  ObjectId: function(id) { return id ? { toString: () => String(id) } : { toString: () => 'mockid' }; },
  // Export noop deserialize/serialize to satisfy imports
  serialize: () => Buffer.from([]),
  deserialize: () => ({}),
};