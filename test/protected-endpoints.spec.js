const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Protected Endpoints', function() {
  let db;

  const {
    testUsers,
    testThings,
    testReviews
  } = helpers.makeThingsFixtures();

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('clean tables', () => helpers.cleanTables(db));

  afterEach('clean tables', () => helpers.cleanTables(db));

  beforeEach('insert things', () => 
    helpers.seedThingsTables(
      db,
      testUsers,
      testThings,
      testReviews
    )
  );

  const protectedEndpoints = [
    {
      name: 'GET /api/things/:thing_id',
      path: '/api/things/1',
      method: supertest(app).get
    },
    {
      name: 'GET /api/things/:thing_id/reviews',
      path: '/api/things/1/reviews',
      method: supertest(app).get
    },
    {
      name: 'POST /api/reviews',
      path: '/api/reviews',
      method: supertest(app).post
    }
  ];

  protectedEndpoints.forEach(endpoint => {
  
    describe(endpoint.name, () => {
      it(`responds 401 and 'Missing basic token' when no basic token`, () => {
        return endpoint.method(endpoint.path)
          .expect(401, { error: 'Missing basic token' });
      });
  
      it(`responds 401 and 'Unauthorized request' when no credentials in token`, () => {
        const noCredsUser = { user_name: '', password: '' };
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(noCredsUser))
          .expect(401, { error: 'Unauthorized request' });
      });
  
      it(`responds 401 and 'Unauthorized request' when invalid user`, () => {
        const userInvalidCreds = { user_name: 'user-not', password: 'existy' };
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(userInvalidCreds))
          .expect(401, { error: 'Unauthorized request' });
      });
  
      it(`responds 401 and 'Unauthorized request' when invalid password`, () => {
        const userInvalidPassword = { user_name: testUsers[0].user_name, password: 'wrong' };
        return endpoint.method(endpoint.path)
          .set('Authorization', helpers.makeAuthHeader(userInvalidPassword))
          .expect(401, { error: 'Unauthorized request' });
      });
    });
  });

});