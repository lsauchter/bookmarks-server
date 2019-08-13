const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray, makeMaliciousBookmark } = require('./bookmarks.fixtures')

describe('Bookmarks endpoints', () => {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean table', () => db('bookmarks').truncate())

    afterEach('cleanup', () => db('bookmarks').truncate())

    describe(`Unauthorized requests`, () => {
        const testBookmarks = makeBookmarksArray()
    
        beforeEach('insert bookmarks', () => {
          return db
            .into('bookmarks')
            .insert(testBookmarks)
        })
    
        it(`responds with 401 Unauthorized for GET /bookmarks`, () => {
          return supertest(app)
            .get('/bookmarks')
            .expect(401, { error: 'Unauthorized request' })
        })
    
        it(`responds with 401 Unauthorized for POST /bookmarks`, () => {
          return supertest(app)
            .post('/bookmarks')
            .send({ title: 'test-title', url: 'http://some.thing.com', rating: 1 })
            .expect(401, { error: 'Unauthorized request' })
        })
    
        it(`responds with 401 Unauthorized for GET /bookmarks/:id`, () => {
          const secondBookmark = testBookmarks[1]
          return supertest(app)
            .get(`/bookmarks/${secondBookmark.id}`)
            .expect(401, { error: 'Unauthorized request' })
        })
    
        it(`responds with 401 Unauthorized for DELETE /bookmarks/:id`, () => {
          const aBookmark = testBookmarks[1]
          return supertest(app)
            .delete(`/bookmarks/${aBookmark.id}`)
            .expect(401, { error: 'Unauthorized request' })
        })
      })
    

    describe('GET /bookmarks', () => {
        context('Given no bookmarks', () => {
            it('responds 200 and with empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, [])
            })
        })

        context('Given bookmarks', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('GET /bookmarks responds 200 and with all bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, testBookmarks)
            })

        })

        context('Given XSS attack bookmark', () => {
            const {maliciousBookmark, expectedBookmark} = makeMaliciousBookmark()

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([ maliciousBookmark ])
            })

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedBookmark.title)
                        expect(res.body[0].description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })

    describe('GET /bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds 404', () => {
                const bookmarkID = 12345
                return supertest(app)
                    .get(`/bookmarks/${bookmarkID}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(404, {error: {message: 'Bookmark does not exist'}})
            })
        })

        context('Given bookmarks', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('GET /bookmarks/:id responds 200 and with bookmark', () => {
                const bookmarkID = 2
                const expectedBookmark = testBookmarks[bookmarkID - 1]
                return supertest(app)
                    .get(`/bookmarks/${bookmarkID}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200, expectedBookmark)
            })
        })

        context('Given XSS attack bookmark', () => {
            const {maliciousBookmark, expectedBookmark} = makeMaliciousBookmark()

            beforeEach('insert malicious bookmark', () => {
                return db
                    .into('bookmarks')
                    .insert([ maliciousBookmark ])
            })

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/bookmarks/${maliciousBookmark.id}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedBookmark.title)
                        expect(res.body.description).to.eql(expectedBookmark.description)
                    })
            })
        })
    })

    describe('POST /bookmarks', () => {
        it('creates bookmark, responds 201 and with bookmark', () => {
            const newBookmark = {
                title: 'Test title',
                url: 'https://test.com',
                description: 'Test description',
                rating: '5'
            }
            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(newBookmark)
                .expect(201)
                .then(res => {
                    expect(res.body.title).to.eql(newBookmark.title)
                    expect(res.body.url).to.eql(newBookmark.url)
                    expect(res.body.description).to.eql(newBookmark.description)
                    expect(res.body.rating).to.eql(newBookmark.rating)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
                })
        })

        const requiredFields = ['title', 'url', 'description', 'rating']

        requiredFields.forEach(field => {
            const newBookmark = {
                title: 'Test title',
                url: 'https://test.com',
                description: 'Test description',
                rating: '5'
            }

            it('responds 400 and with error message', () => {
                delete newBookmark[field]

                return supertest(app)
                    .post('/bookmarks')
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .send(newBookmark)
                    .expect(400, {
                        error: { message:  `Missing ${field} in request` }
                    })
            })
        })

        it('removes XSS attack content', () => {
            const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
            return supertest(app)
                .post('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .send(maliciousBookmark)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(expectedBookmark.title)
                    expect(res.body.url).to.eql(expectedBookmark.url)
                    expect(res.body.description).to.eql(expectedBookmark.description)
                    expect(res.body.rating).to.eql(expectedBookmark.rating)
                })
        })
    })

    describe('DELETE /bookmarks/:id', () => {
        context('Given bookmark', () => {
            const testBookmarks = makeBookmarksArray()

            beforeEach('insert bookmarks', () => {
                return db
                    .into('bookmarks')
                    .insert(testBookmarks)
            })

            it('responds 204 and removes bookmark', () => {
                const idToRemove = 2
                const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)
                return supertest(app)
                    .delete(`/bookmarks/${idToRemove}`)
                    .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                    .expect(204)
                    .then(res => {
                        supertest(app)
                            .get('/bookmarks')
                            .expect(expectedBookmarks)
                    })
            })

            context('Given no bookmarks', () => {
                it('responds 404', () => {
                    const bookmarkID = 12345
                    return supertest(app)
                        .delete(`/bookmarks/${bookmarkID}`)
                        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                        .expect(404, {error: {message: 'Bookmark does not exist'}})
                })
            })
        })
    })

})