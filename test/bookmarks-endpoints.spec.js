const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks.fixtures')

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

    describe('GET /bookmarks', () => {
        context('Given no bookmarks', () => {
            it('responds 200 and with empty list', () => {
                return supertest(app)
                    .get('/bookmarks')
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

            it('responds 200 and with all bookmarks', () => {
                return supertest(app)
                    .get('/bookmarks')
                    .expect(200, testBookmarks)
            })

        })
    })

    describe('GET /bookmarks/:id', () => {
        context('Given no bookmarks', () => {
            it('responds 404', () => {
                const bookmarkID = 12345
                return supertest(app)
                    .get(`/bookmarks/${bookmarkID}`)
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
                    .expect(200, expectedBookmark)
            })
        })
    })

})