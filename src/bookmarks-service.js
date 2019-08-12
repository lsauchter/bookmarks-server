const BookmarksService = {
    getAllBookmarks(knex) {
        return knex('bookmarks').select('*')
    },
    getById(knex, id) {
        return knex('bookmarks').select('*').where({ id }).first()
    }
}

module.exports = BookmarksService