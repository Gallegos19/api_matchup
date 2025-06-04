const PostgreSQLUserRepository = require('./PostgreSQLUserRepository');
const PostgreSQLMatchRepository = require('./PostgreSQLMatchRepository');
const PostgreSQLMessageRepository = require('./PostgreSQLMessageRepository');
const PostgreSQLEventRepository = require('./PostgreSQLEventRepository');
const PostgreSQLStudyGroupRepository = require('./PostgreSQLStudyGroupRepository');
const BaseRepository = require('./BaseRepository');

module.exports = {
  PostgreSQLUserRepository,
  PostgreSQLMatchRepository,
  PostgreSQLMessageRepository,
  PostgreSQLEventRepository,
  PostgreSQLStudyGroupRepository,
  BaseRepository
};