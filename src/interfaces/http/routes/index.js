const createAuthRoutes = require('./authRoutes');
const createUserRoutes = require('./userRoutes');
const createMatchRoutes = require('./matchRoutes');
const createChatRoutes = require('./chatRoutes');
const createEventRoutes = require('./eventRoutes');
const createStudyGroupRoutes = require('./studyGroupRoutes');

module.exports = {
  createAuthRoutes,
  createUserRoutes,
  createMatchRoutes,
  createChatRoutes,
  createEventRoutes,
  createStudyGroupRoutes
};